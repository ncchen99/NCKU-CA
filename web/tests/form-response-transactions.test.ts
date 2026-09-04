import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import test from "node:test";

test("submission and edit transactions enforce club and response invariants", async (t) => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "FIRESTORE_EMULATOR_HOST is required",
  );

  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const projectId = "ncku-ca-rulestest";
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 = Buffer.from(
    JSON.stringify({
      project_id: projectId,
      client_email: `test@${projectId}.iam.gserviceaccount.com`,
      private_key: privateKey,
    }),
  ).toString("base64");

  const [firestore, forms] = await Promise.all([
    import("../src/lib/firebase-admin"),
    import("../src/lib/firestore/forms"),
  ]);
  const db = firestore.getAdminDb();
  const prefix = randomUUID();
  const formId = `${prefix}-form`;
  const oldClubId = `${prefix}-old`;
  const newClubId = `${prefix}-new`;
  const inactiveClubId = `${prefix}-inactive`;
  const responseId = `${prefix}-response`;
  const depositId = `${prefix}-deposit`;
  const ownerUid = `${prefix}-owner`;
  const fields = [
    {
      id: "primary",
      type: "club_picker",
      label: "主要社團",
      required: true,
      order: 0,
    },
    {
      id: "secondary",
      type: "club_picker",
      label: "協辦社團",
      required: false,
      order: 1,
    },
    {
      id: "club_name_custom",
      type: "text",
      label: "自填組織",
      required: true,
      order: 2,
      depends_on: {
        field_id: "primary",
        operator: "equals",
        value: "none",
        action: "show",
      },
    },
  ];
  const formRef = db.collection("forms").doc(formId);
  const responseRef = formRef.collection("responses").doc(responseId);
  const depositRef = db.collection("deposit_records").doc(depositId);

  t.after(async () => {
    await Promise.all([
      db.recursiveDelete(formRef),
      depositRef.delete(),
      db.collection("clubs").doc(oldClubId).delete(),
      db.collection("clubs").doc(newClubId).delete(),
      db.collection("clubs").doc(inactiveClubId).delete(),
    ]);
  });

  await Promise.all([
    formRef.set({ status: "open", fields, deposit_policy: { required: false } }),
    db.collection("clubs").doc(oldClubId).set({ is_active: true }),
    db.collection("clubs").doc(newClubId).set({ is_active: true }),
    db.collection("clubs").doc(inactiveClubId).set({ is_active: false }),
  ]);

  await assert.rejects(
    () =>
      forms.submitFormResponse(formId, {
        form_id: formId,
        club_id: oldClubId,
        submitted_by_uid: `${prefix}-submitter`,
        answers: { primary: oldClubId, secondary: inactiveClubId },
      }),
    forms.InvalidClubSubmissionError,
  );
  assert.equal((await formRef.collection("responses").get()).size, 0);

  await assert.rejects(
    () =>
      forms.submitFormResponse(formId, {
        form_id: formId,
        club_id: "none",
        submitted_by_uid: `${prefix}-custom-submitter`,
        answers: { primary: "none", club_name_custom: "none" },
      }),
    /有效的社團／組織名稱/,
  );

  await Promise.all([
    responseRef.set({
      form_id: formId,
      club_id: oldClubId,
      club_name_custom: "舊名稱",
      submitted_by_uid: ownerUid,
      answers: { primary: oldClubId },
    }),
    depositRef.set({
      form_id: formId,
      form_response_id: responseId,
      club_id: oldClubId,
      club_name_custom: "舊名稱",
    }),
    formRef.collection("responses").doc(`${prefix}-duplicate`).set({
      form_id: formId,
      club_id: newClubId,
      submitted_by_uid: `${prefix}-other`,
      answers: { primary: newClubId },
    }),
  ]);

  await assert.rejects(
    () =>
      forms.updateFormResponse(
        formId,
        responseId,
        { primary: newClubId },
        ownerUid,
      ),
    forms.DuplicateFormSubmissionError,
  );
  assert.equal((await responseRef.get()).data()?.club_id, oldClubId);
  assert.equal((await depositRef.get()).data()?.club_id, oldClubId);

  await formRef
    .collection("responses")
    .doc(`${prefix}-duplicate`)
    .delete();
  await forms.updateFormResponse(
    formId,
    responseId,
    { primary: newClubId },
    ownerUid,
  );
  assert.equal((await responseRef.get()).data()?.club_id, newClubId);
  assert.equal((await responseRef.get()).data()?.club_name_custom, undefined);
  assert.equal((await depositRef.get()).data()?.club_id, newClubId);
  assert.equal((await depositRef.get()).data()?.club_name_custom, undefined);

  await assert.rejects(
    () =>
      forms.updateFormResponse(
        formId,
        responseId,
        { primary: newClubId, secondary: inactiveClubId },
        ownerUid,
      ),
    forms.InvalidClubSubmissionError,
  );
  assert.deepEqual((await responseRef.get()).data()?.answers, {
    primary: newClubId,
  });

  await forms.updateFormResponse(
    formId,
    responseId,
    { primary: "none", club_name_custom: "新組織" },
    ownerUid,
  );
  assert.equal((await responseRef.get()).data()?.club_id, "none");
  assert.equal((await responseRef.get()).data()?.club_name_custom, "新組織");
  assert.equal((await depositRef.get()).data()?.club_id, "none");
  assert.equal((await depositRef.get()).data()?.club_name_custom, "新組織");

  await assert.rejects(
    () =>
      forms.updateFormResponse(
        formId,
        responseId,
        { primary: "none", club_name_custom: "none" },
        ownerUid,
      ),
    /有效的社團／組織名稱/,
  );
  await assert.rejects(
    () =>
      forms.updateFormResponse(
        formId,
        responseId,
        { primary: oldClubId },
        `${prefix}-attacker`,
      ),
    forms.ForbiddenFormResponseUpdateError,
  );

  await formRef.update({ status: "closed" });
  await assert.rejects(
    () =>
      forms.updateFormResponse(
        formId,
        responseId,
        { primary: oldClubId },
        ownerUid,
      ),
    forms.FormNotOpenError,
  );
  assert.equal((await responseRef.get()).data()?.club_id, "none");
});
