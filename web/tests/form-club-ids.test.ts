import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import test from "node:test";
import type { FormField } from "../src/types";

test("club IDs remain single document IDs across submission and edit", async (t) => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "", /^(localhost|127\.0\.0\.1):\d+$/,
    "A local Firestore emulator is required");
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify({
    project_id: "ncku-ca-rulestest",
    client_email: "test@ncku-ca-rulestest.iam.gserviceaccount.com",
    private_key: privateKey,
  })).toString("base64");
  const [{ getAdminDb }, forms] = await Promise.all([
    import("../src/lib/firebase-admin"),
    import("../src/lib/firestore/forms"),
  ]);
  const db = getAdminDb();
  const prefix = randomUUID();
  const clubA = `${prefix}-a`;
  const clubB = `${prefix}-b`;
  const literalIds = [`${prefix}-社團`, `${prefix}%2Fclub`, `${prefix}／club`, `${prefix}\\club`];
  const clubRefs = [clubA, clubB, ...literalIds].map((id) => db.collection("clubs").doc(id));
  const nestedClub = db.doc(`clubs/${clubA}/nested/active`);
  const formRef = db.collection("forms").doc(prefix);
  const responses = formRef.collection("responses");
  const deposits = db.collection("deposit_records").where("form_id", "==", formRef.id);
  const fields: FormField[] = [
    { id: "primary", type: "club_picker", label: "社團", required: true, order: 0 },
    {
      id: "secondary", type: "club_picker", label: "協辦社團", required: false, order: 1,
      depends_on: { field_id: "primary", operator: "equals", value: "none", action: "show" },
    },
    { id: "club_name_custom", type: "text", label: "自填名稱", required: false, order: 2 },
  ];
  const invalidIds = [
    `/${clubA}`, `${clubA}/`, `/${clubA}/`, ` /${clubA}/ `,
    `${clubA}/nested/active`, `${clubA}/nested`, `${clubA}//`,
  ];
  const submit = (clubId: string, answers: Record<string, unknown> = { primary: clubId }, uid = prefix) =>
    forms.submitFormResponse(formRef.id, {
      form_id: formRef.id, club_id: clubId, submitted_by_uid: uid, answers,
    });

  t.after(async () => {
    const createdDeposits = await deposits.get();
    await Promise.all(createdDeposits.docs.map((doc) => doc.ref.delete()));
    await db.recursiveDelete(formRef);
    await Promise.all([...clubRefs, nestedClub].map((ref) => ref.delete()));
    await db.terminate();
  });
  await Promise.all([
    formRef.create({
      status: "open", fields,
      deposit_policy: { required: true, amount: 100, binding_mode: "linked_to_response" },
    }),
    ...[...clubRefs, nestedClub].map((ref) => ref.create({ is_active: true })),
  ]);
  const responseA = await submit(clubA, { primary: ` ${clubA} ` }, `${prefix}-a`);
  const responseB = await submit(clubB, { primary: clubB }, `${prefix}-b`);
  const responseRef = responses.doc(responseB);
  const depositRef = (await deposits.get()).docs.find((doc) => doc.data().form_response_id === responseB)!.ref;
  const initialResponses = (await responses.get()).docs.map((doc) => doc.data());
  const initialDeposits = (await deposits.get()).docs.map((doc) => doc.data());

  await t.test("primary and visible secondary path aliases cannot add responses or deposits", async () => {
    for (const id of invalidIds) {
      await assert.rejects(() => submit(id), forms.InvalidClubSubmissionError);
      await assert.rejects(() => submit("none", { primary: "none", secondary: id, club_name_custom: "測試組織" }),
        forms.InvalidClubSubmissionError);
    }
    assert.deepEqual((await responses.get()).docs.map((doc) => doc.data()), initialResponses);
    assert.deepEqual((await deposits.get()).docs.map((doc) => doc.data()), initialDeposits);
  });

  await t.test("legacy forms reject a path supplied through the profile fallback", async () => {
    await formRef.update({ fields: [] });
    try {
      for (const id of invalidIds) {
        await assert.rejects(() => submit(id, {}), forms.InvalidClubSubmissionError);
      }
      assert.deepEqual((await responses.get()).docs.map((doc) => doc.data()), initialResponses);
      assert.deepEqual((await deposits.get()).docs.map((doc) => doc.data()), initialDeposits);
    } finally {
      await formRef.update({ fields });
    }
  });

  await t.test("canonical duplicates and path aliases cannot change a response or its deposit", async () => {
    await assert.rejects(() => submit(clubA), forms.DuplicateFormSubmissionError);
    await assert.rejects(() => forms.updateFormResponse(formRef.id, responseB,
      { primary: clubA }, `${prefix}-b`), forms.DuplicateFormSubmissionError);
    const beforeResponse = (await responseRef.get()).data();
    const beforeDeposit = (await depositRef.get()).data();
    for (const id of invalidIds) {
      for (const answers of [{ primary: id }, { primary: "none", secondary: id, club_name_custom: "測試組織" }]) {
        await assert.rejects(() => forms.updateFormResponse(formRef.id, responseB, answers, `${prefix}-b`),
          forms.InvalidClubSubmissionError);
        assert.deepEqual((await responseRef.get()).data(), beforeResponse);
        assert.deepEqual((await depositRef.get()).data(), beforeDeposit);
      }
    }
    assert.equal((await responses.doc(responseA).get()).data()?.club_id, clubA);
  });

  await t.test("an existing response cannot supply an unsafe fallback ID", async () => {
    await formRef.update({ fields: [] });
    const original = (await responseRef.get()).data()!;
    const beforeDeposit = (await depositRef.get()).data();
    try {
      for (const id of invalidIds) {
        await responseRef.update({ club_id: id });
        const before = (await responseRef.get()).data();
        await assert.rejects(() => forms.updateFormResponse(formRef.id, responseB, {}, `${prefix}-b`),
          forms.InvalidClubSubmissionError);
        assert.deepEqual((await responseRef.get()).data(), before);
        assert.deepEqual((await depositRef.get()).data(), beforeDeposit);
      }
    } finally {
      await responseRef.set(original);
      await formRef.update({ fields });
    }
  });

  await t.test("Unicode and percent-like IDs stay literal, and none still synchronizes linked deposits", async () => {
    for (const id of literalIds) {
      const responseId = await submit(id, { primary: id }, `${prefix}-${id}`);
      assert.equal((await responses.doc(responseId).get()).data()?.club_id, id);
    }
    await forms.updateFormResponse(formRef.id, responseB,
      { primary: "none", club_name_custom: "測試組織" }, `${prefix}-b`);
    assert.equal((await responseRef.get()).data()?.club_id, "none");
    assert.equal((await depositRef.get()).data()?.club_id, "none");
    assert.equal((await depositRef.get()).data()?.club_name_custom, "測試組織");
    await forms.updateFormResponse(formRef.id, responseB, { primary: clubB }, `${prefix}-b`);
    assert.equal((await depositRef.get()).data()?.club_id, clubB);
    assert.equal((await depositRef.get()).data()?.club_name_custom, undefined);
  });
});
