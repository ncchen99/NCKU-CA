import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID } from "node:crypto";
import test from "node:test";

test("submission and edit transactions enforce club and response invariants", async (t) => {
  assert.match(
    process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(localhost|127\.0\.0\.1):\d+$/,
    "A local FIRESTORE_EMULATOR_HOST is required",
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
    formRef.set({
      status: "open",
      fields,
      deposit_policy: { required: false, binding_mode: "linked_to_response" },
    }),
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

  for (const bindingMode of ["independent", undefined, "unknown-mode"]) {
    for (const status of ["pending_payment", "paid", "returned"]) {
      await t.test(`${bindingMode ?? "unspecified"} ${status} deposits remain unchanged`, async () => {
        await Promise.all([
          formRef.update({
            status: "open",
            deposit_policy: {
              required: true,
              amount: 100,
              ...(bindingMode ? { binding_mode: bindingMode } : {}),
            },
          }),
          responseRef.set({
            form_id: formId,
            submitted_by_uid: ownerUid,
            club_id: oldClubId,
            answers: { primary: oldClubId },
          }),
          depositRef.set({
            form_id: formId,
            form_response_id: responseId,
            club_id: oldClubId,
            club_name_custom: "管理員維護的名稱",
            status,
            amount: 100,
            paid_at: new Date("2026-01-01T00:00:00Z"),
            returned_at: new Date("2026-01-02T00:00:00Z"),
            updated_by: "finance-admin",
          }),
        ]);
        const beforeDeposit = (await depositRef.get()).data();

        await forms.updateFormResponse(formId, responseId, { primary: newClubId }, ownerUid);
        assert.equal((await responseRef.get()).data()?.club_id, newClubId);
        assert.deepEqual((await depositRef.get()).data(), beforeDeposit);

        await forms.updateFormResponse(
          formId,
          responseId,
          { primary: "none", club_name_custom: "修改後的組織" },
          ownerUid,
        );
        assert.equal((await responseRef.get()).data()?.club_name_custom, "修改後的組織");
        assert.deepEqual((await depositRef.get()).data(), beforeDeposit);
      });
    }
  }

  for (const linkedFormId of [undefined, `${prefix}-other-form`]) {
    await t.test("linked mode preserves deposits without an exact form identity", async () => {
      await Promise.all([
        formRef.update({ deposit_policy: { required: false, binding_mode: "linked_to_response" } }),
        depositRef.set({
          form_response_id: responseId,
          ...(linkedFormId ? { form_id: linkedFormId } : {}),
          club_id: oldClubId,
          club_name_custom: "獨立維護",
          status: "paid",
        }),
      ]);
      const beforeDeposit = (await depositRef.get()).data();
      await forms.updateFormResponse(formId, responseId, { primary: newClubId }, ownerUid);
      assert.deepEqual((await depositRef.get()).data(), beforeDeposit);
    });
  }

  for (const [responseName, depositName] of [
    ["回覆原有名稱", "保證金原有名稱"],
    [undefined, "保證金原有名稱"],
    ["回覆原有名稱", undefined],
    [undefined, undefined],
  ]) {
    await t.test(
      `legacy notes edits preserve each stored name (response: ${responseName ?? "absent"}, deposit: ${depositName ?? "absent"})`,
      async () => {
        await Promise.all([
          formRef.update({
            status: "open",
            fields: [{ id: "notes", type: "text", label: "備註", required: false, order: 0 }],
            deposit_policy: { required: false, binding_mode: "linked_to_response" },
          }),
          responseRef.set({
            form_id: formId,
            submitted_by_uid: ownerUid,
            club_id: "none",
            ...(responseName ? { club_name_custom: responseName } : {}),
            answers: { notes: "原有備註" },
          }),
          depositRef.set({
            form_id: formId,
            form_response_id: responseId,
            club_id: "none",
            ...(depositName ? { club_name_custom: depositName } : {}),
            status: "paid",
            amount: 100,
            updated_by: "finance-admin",
          }),
        ]);
        const beforeDeposit = (await depositRef.get()).data();

        await forms.updateFormResponse(formId, responseId, { notes: " 更新備註 " }, ownerUid);

        const response = (await responseRef.get()).data()!;
        assert.deepEqual(response.answers, { notes: "更新備註" });
        assert.equal(response.club_id, "none");
        assert.equal(response.club_name_custom, responseName);
        assert.equal(Object.hasOwn(response, "club_name_custom"), responseName !== undefined);
        assert.deepEqual((await depositRef.get()).data(), beforeDeposit);
      },
    );
  }

  await t.test("a hidden custom name preserves existing response and deposit names", async () => {
    await Promise.all([
      formRef.update({
        fields: [
          { id: "notes", type: "text", label: "備註", required: false, order: 0 },
          {
            id: "club_name_custom", type: "text", label: "自填組織", required: true, order: 1,
            depends_on: { field_id: "notes", operator: "equals", value: "改名", action: "show" },
          },
        ],
      }),
      responseRef.update({ club_name_custom: "回覆原有名稱" }),
      depositRef.update({ club_name_custom: "保證金原有名稱" }),
    ]);
    const beforeDeposit = (await depositRef.get()).data();

    await forms.updateFormResponse(
      formId, responseId, { notes: "更新備註", club_name_custom: { stale: true } }, ownerUid,
    );

    const response = (await responseRef.get()).data()!;
    assert.deepEqual(response.answers, { notes: "更新備註" });
    assert.equal(response.club_id, "none");
    assert.equal(response.club_name_custom, "回覆原有名稱");
    assert.deepEqual((await depositRef.get()).data(), beforeDeposit);
  });

  for (const nameFieldState of ["removed", "hidden"]) {
    await t.test(`a visible none picker preserves a valid legacy name when its input is ${nameFieldState}`, async () => {
      await Promise.all([
        formRef.update({
          fields: [
            { id: "primary", type: "club_picker", label: "社團", required: true, order: 0 },
            { id: "notes", type: "text", label: "備註", required: false, order: 1 },
            ...(nameFieldState === "hidden" ? [{
              id: "club_name_custom", type: "text", label: "自填組織", required: true, order: 2,
              depends_on: { field_id: "notes", operator: "equals", value: "改名", action: "show" },
            }] : []),
          ],
        }),
        responseRef.set({
          form_id: formId, submitted_by_uid: ownerUid, club_id: "none",
          club_name_custom: "回覆原有名稱", answers: { primary: "none", notes: "原有備註" },
        }),
        depositRef.update({ club_name_custom: "保證金原有名稱" }),
      ]);
      const answers = { primary: "none", notes: "更新備註" };
      const beforeDeposit = (await depositRef.get()).data();

      await forms.updateFormResponse(formId, responseId, answers, ownerUid);
      assert.deepEqual((await responseRef.get()).data()?.answers, answers);
      assert.equal((await responseRef.get()).data()?.club_name_custom, "回覆原有名稱");
      assert.deepEqual((await depositRef.get()).data(), beforeDeposit);

      await assert.rejects(() => forms.submitFormResponse(formId, {
        form_id: formId, club_id: "none", submitted_by_uid: `${prefix}-new-legacy`,
        club_name_custom: "不可信的名稱", answers,
      }), /有效的社團／組織名稱/);

      for (const existingName of [undefined, "", "none", " none ", { invalid: true }]) {
        await responseRef.set({
          form_id: formId, submitted_by_uid: ownerUid, club_id: "none", answers,
          ...(existingName === undefined ? {} : { club_name_custom: existingName }),
        });
        const beforeResponse = (await responseRef.get()).data();
        await assert.rejects(() => forms.updateFormResponse(formId, responseId, answers, ownerUid),
          /有效的社團／組織名稱/);
        assert.deepEqual((await responseRef.get()).data(), beforeResponse);
        assert.deepEqual((await depositRef.get()).data(), beforeDeposit);
      }

      await responseRef.update({ club_id: oldClubId, club_name_custom: "舊社團附帶名稱" });
      await assert.rejects(() => forms.updateFormResponse(formId, responseId, answers, ownerUid),
        /有效的社團／組織名稱/);
      assert.equal((await responseRef.get()).data()?.club_id, oldClubId);
      assert.deepEqual((await depositRef.get()).data(), beforeDeposit);
    });
  }

  await t.test("a visible none picker cannot reuse a stored name after its editable name is cleared", async () => {
    await Promise.all([
      formRef.update({ fields: [
        { id: "primary", type: "club_picker", label: "社團", required: true, order: 0 },
        { id: "club_name_custom", type: "text", label: "自填組織", required: false, order: 1 },
      ] }),
      responseRef.update({ club_id: "none", club_name_custom: "回覆原有名稱" }),
    ]);
    await assert.rejects(() => forms.updateFormResponse(
      formId, responseId, { primary: "none", club_name_custom: "" }, ownerUid,
    ), /有效的社團／組織名稱/);
    assert.equal((await responseRef.get()).data()?.club_name_custom, "回覆原有名稱");
  });

  await t.test("an available custom name can still be cleared and replaced", async () => {
    await Promise.all([
      formRef.update({
        fields: [{ id: "club_name_custom", type: "text", label: "自填組織", required: false, order: 0 }],
      }),
      responseRef.update({ club_name_custom: "回覆原有名稱" }),
      depositRef.update({ club_name_custom: "保證金原有名稱" }),
    ]);

    await forms.updateFormResponse(formId, responseId, { club_name_custom: "" }, ownerUid);
    assert.equal((await responseRef.get()).data()?.club_name_custom, undefined);
    assert.equal((await depositRef.get()).data()?.club_name_custom, undefined);

    await forms.updateFormResponse(formId, responseId, { club_name_custom: "新組織" }, ownerUid);
    assert.equal((await responseRef.get()).data()?.club_name_custom, "新組織");
    assert.equal((await depositRef.get()).data()?.club_name_custom, "新組織");
  });
});
