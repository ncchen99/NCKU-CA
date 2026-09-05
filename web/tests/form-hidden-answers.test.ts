import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import test from "node:test";
import type { DocumentReference } from "firebase-admin/firestore";
import { InvalidFormAnswersError } from "../src/lib/form-response-validation";
import type { DependsOn, FormField } from "../src/types";

function field(
  id: string,
  type: FormField["type"],
  overrides: Partial<FormField> = {},
): FormField {
  return { id, type, label: id, required: true, order: 0, ...overrides };
}

function branch(action: DependsOn["action"] = "show"): DependsOn {
  return { field_id: "mode", operator: "equals", value: "on", action };
}

test("only currently visible answers participate in submission and edit transactions", async (t) => {
  assert.match(
    process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(localhost|127\.0\.0\.1):\d+$/,
    "A local Firestore emulator is required",
  );
  const projectId = "ncku-ca-rulestest";
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify({
    project_id: projectId,
    client_email: `test@${projectId}.iam.gserviceaccount.com`,
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
  const inactiveClub = `${prefix}-inactive`;
  const clubRefs = [clubA, clubB, inactiveClub].map((id) => db.collection("clubs").doc(id));
  const formRefs: DocumentReference[] = [];

  t.after(async () => {
    for (const formRef of formRefs) {
      const deposits = await db.collection("deposit_records").where("form_id", "==", formRef.id).get();
      await Promise.all(deposits.docs.map((doc) => doc.ref.delete()));
      await db.recursiveDelete(formRef);
    }
    await Promise.all(clubRefs.map((ref) => ref.delete()));
    await db.terminate();
  });
  await Promise.all(clubRefs.map((ref) => ref.create({ is_active: ref.id !== inactiveClub })));

  async function fixture(fields: FormField[]) {
    const formRef = db.collection("forms").doc(`${prefix}-${formRefs.length}`);
    formRefs.push(formRef);
    const uid = `${formRef.id}-owner`;
    const responses = formRef.collection("responses");
    const deposits = db.collection("deposit_records").where("form_id", "==", formRef.id);
    await formRef.create({
      status: "open",
      fields,
      deposit_policy: { required: true, amount: 100, binding_mode: "linked_to_response" },
    });
    return {
      submit: (answers: Record<string, unknown>, fallback = clubB) => forms.submitFormResponse(formRef.id, {
        form_id: formRef.id, submitted_by_uid: uid, club_id: fallback, answers,
      }),
      edit: (id: string, answers: Record<string, unknown>) =>
        forms.updateFormResponse(formRef.id, id, answers, uid),
      state: async () => {
        const snapshots = await Promise.all([responses.get(), deposits.get()]);
        return snapshots.map((snapshot) => snapshot.docs.map((doc) => ({
          id: doc.id, data: doc.data(), updateTime: doc.updateTime,
        })));
      },
      assertStored: async (id: string, expected: Record<string, unknown>, clubId: string) => {
        const [response, linkedDeposits] = await Promise.all([responses.doc(id).get(), deposits.get()]);
        assert.deepEqual(response.data()?.answers, expected);
        assert.equal(response.data()?.club_id, clubId);
        assert.equal(linkedDeposits.size, 1);
        assert.equal(linkedDeposits.docs[0].data().form_response_id, id);
        assert.equal(linkedDeposits.docs[0].data().club_id, clubId);
        return { response: response.data()!, deposit: linkedDeposits.docs[0].data() };
      },
    };
  }

  const mode = field("mode", "radio", { options: ["on", "off"] });
  const primary = field("primary", "club_picker");
  const malformedCases: { type: FormField["type"]; invalid: unknown; valid: unknown }[] = [
    { type: "email", invalid: "not-an-email", valid: "member@example.test" },
    { type: "number", invalid: "not-a-number", valid: "3" },
    { type: "checkbox", invalid: ["A", 7], valid: ["A"] },
  ];

  for (const { type, invalid, valid } of malformedCases) {
    for (const action of ["show", "hide"] as const) {
      await t.test(`${action} branch drops a stale malformed ${type} on submit and edit`, async () => {
        const form = await fixture([
          mode,
          primary,
          field("conditional", type, { options: ["A", "B"], depends_on: branch(action) }),
        ]);
        const hiddenMode = action === "show" ? "off" : "on";
        const visibleMode = action === "show" ? "on" : "off";
        const hidden = { mode: hiddenMode, primary: clubA, conditional: invalid };
        const expectedHidden = { mode: hiddenMode, primary: clubA };
        const id = await form.submit(hidden);
        await form.assertStored(id, expectedHidden, clubA);

        const before = await form.state();
        const visibleInvalid = { ...hidden, mode: visibleMode };
        await assert.rejects(() => form.submit(visibleInvalid), InvalidFormAnswersError);
        assert.deepEqual(await form.state(), before, "rejected submission must perform zero writes");
        await assert.rejects(() => form.edit(id, visibleInvalid), InvalidFormAnswersError);
        assert.deepEqual(await form.state(), before, "rejected edit must perform zero writes");
        await assert.rejects(() => form.edit(id, { mode: visibleMode, primary: clubA }), InvalidFormAnswersError);
        assert.deepEqual(await form.state(), before, "a missing visible required answer must perform zero writes");

        const visibleValid = { mode: visibleMode, primary: clubA, conditional: valid };
        await form.edit(id, visibleValid);
        await form.assertStored(id, visibleValid, clubA);
        await form.edit(id, hidden);
        await form.assertStored(id, expectedHidden, clubA);
      });
    }
  }

  for (const [label, staleClub] of [
    ["missing", `${prefix}-missing`],
    ["inactive", inactiveClub],
    ["path-like", `${clubB}/nested/active`],
  ]) {
    await t.test(`a hidden ${label} first picker cannot override the visible picker`, async () => {
      const form = await fixture([
        field("obsolete", "club_picker", { depends_on: branch() }),
        mode,
        primary,
      ]);
      const hidden = { mode: "off", obsolete: staleClub, primary: clubA };
      const id = await form.submit(hidden, clubB);
      await form.assertStored(id, { mode: "off", primary: clubA }, clubA);

      const before = await form.state();
      const visibleInvalid = { ...hidden, mode: "on" };
      await assert.rejects(() => form.submit(visibleInvalid), forms.InvalidClubSubmissionError);
      assert.deepEqual(await form.state(), before);
      await assert.rejects(() => form.edit(id, visibleInvalid), forms.InvalidClubSubmissionError);
      assert.deepEqual(await form.state(), before);

      await form.edit(id, { mode: "on", obsolete: clubB, primary: clubA });
      await form.assertStored(id, { mode: "on", obsolete: clubB, primary: clubA }, clubB);
      await form.edit(id, hidden);
      await form.assertStored(id, { mode: "off", primary: clubA }, clubA);
    });
  }

  for (const fallback of [clubA, "none"]) {
    await t.test(`all hidden pickers use the ${fallback === "none" ? "none" : "trusted profile"} fallback`, async () => {
      const form = await fixture([
        field("obsolete", "club_picker", { depends_on: branch() }),
        mode,
        field("secondary", "club_picker", { depends_on: branch() }),
        field("club_name_custom", "text", {
          depends_on: { field_id: "obsolete", operator: "equals", value: "none", action: "show" },
        }),
      ]);
      const id = await form.submit({
        mode: "off", obsolete: clubB, secondary: inactiveClub, club_name_custom: "Stale organization",
      }, fallback);
      const created = await form.assertStored(id, { mode: "off" }, fallback);
      assert.equal(Object.hasOwn(created.response, "club_name_custom"), false);
      assert.equal(Object.hasOwn(created.deposit, "club_name_custom"), false);

      await form.edit(id, {
        mode: "off", obsolete: "none", secondary: `${clubB}/nested/active`, club_name_custom: "none",
      });
      const edited = await form.assertStored(id, { mode: "off" }, fallback);
      assert.equal(Object.hasOwn(edited.response, "club_name_custom"), false);
      assert.equal(Object.hasOwn(edited.deposit, "club_name_custom"), false);
    });
  }

  await t.test("hidden controllers are unanswered for chained show and hide branches", async () => {
    const form = await fixture([
      field("chained_email", "email", {
        depends_on: { field_id: "controller", operator: "equals", value: "yes", action: "show" },
      }),
      field("empty_note", "text", {
        depends_on: { field_id: "controller", operator: "is_empty", value: null, action: "show" },
      }),
      field("hide_note", "text", {
        depends_on: { field_id: "controller", operator: "equals", value: "yes", action: "hide" },
      }),
      field("controller", "text", { depends_on: branch() }),
      mode,
      primary,
    ]);
    const hidden = {
      mode: "off", primary: clubA, controller: "yes", chained_email: "bad-email",
      empty_note: "No controller", hide_note: "Visible when controller is hidden",
    };
    const expectedHidden = {
      mode: "off", primary: clubA,
      empty_note: "No controller", hide_note: "Visible when controller is hidden",
    };
    const id = await form.submit(hidden);
    await form.assertStored(id, expectedHidden, clubA);
    const visible = {
      mode: "on", primary: clubA, controller: "yes", chained_email: "member@example.test",
      empty_note: { stale: true }, hide_note: { stale: true },
    };
    await form.edit(id, visible);
    await form.assertStored(id, {
      mode: "on", primary: clubA, controller: "yes", chained_email: "member@example.test",
    }, clubA);
    await form.edit(id, hidden);
    await form.assertStored(id, expectedHidden, clubA);
  });

  await t.test("cyclic dependencies stay hidden on submit and edit", async () => {
    const form = await fixture([
      primary,
      field("cycle_a", "email", {
        depends_on: { field_id: "cycle_b", operator: "is_not_empty", value: null, action: "show" },
      }),
      field("cycle_b", "number", {
        depends_on: { field_id: "cycle_a", operator: "is_not_empty", value: null, action: "show" },
      }),
    ]);
    const stale = { primary: clubA, cycle_a: "invalid-email", cycle_b: "invalid-number" };
    const id = await form.submit(stale);
    await form.assertStored(id, { primary: clubA }, clubA);
    await form.edit(id, stale);
    await form.assertStored(id, { primary: clubA }, clubA);
  });
});
