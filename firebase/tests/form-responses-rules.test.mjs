import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const rulesFile = process.argv[2] ?? "../firestore.rules";
const testEnv = await initializeTestEnvironment({
  projectId: "ncku-ca-rulestest",
  firestore: {
    host: "127.0.0.1",
    port: 8099,
    rules: fs.readFileSync(rulesFile, "utf8"),
  },
});

const STUDENT_UID = "student-uid-001";
const OTHER_UID = "student-uid-002";

function userContext(uid, role = "club_member") {
  return testEnv.authenticatedContext(uid, {
    email: `${uid}@gs.ncku.edu.tw`,
    email_verified: true,
    role,
  });
}

function responsePayload(formId = "open-form") {
  return {
    form_id: formId,
    club_id: "club-a",
    submitted_by_uid: STUDENT_UID,
    answers: { note: "test" },
    submitted_at: serverTimestamp(),
    is_duplicate_attempt: false,
  };
}

let pass = 0;
let fail = 0;
async function t(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    fail++;
    console.log(`  ❌ ${name}\n     → ${error.message?.split("\n")[0]}`);
  }
}

console.log(`\n=== Form response rules: ${rulesFile} ===\n`);

await testEnv.clearFirestore();
await testEnv.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, "forms", "open-form"), { status: "open" });
  await setDoc(
    doc(db, "forms", "open-form", "responses", "server-created"),
    responsePayload(),
  );
});

await t("學生不可在不存在的表單下自訂 response ID", async () => {
  const db = userContext(STUDENT_UID).firestore();
  await assertFails(
    setDoc(
      doc(db, "forms", "ghost-form", "responses", "chosen-id"),
      responsePayload("ghost-form"),
    ),
  );
});

await t("學生不可在有效表單下以 setDoc 建立回覆", async () => {
  const db = userContext(STUDENT_UID).firestore();
  await assertFails(
    setDoc(
      doc(db, "forms", "open-form", "responses", "chosen-id"),
      responsePayload(),
    ),
  );
});

await t("學生不可在有效表單下以 addDoc 建立回覆", async () => {
  const db = userContext(STUDENT_UID).firestore();
  await assertFails(
    addDoc(collection(db, "forms", "open-form", "responses"), responsePayload()),
  );
});

await t("管理員 Client SDK 也不可繞過提交 API 建立回覆", async () => {
  const db = userContext("admin-uid", "admin").firestore();
  await assertFails(
    setDoc(
      doc(db, "forms", "open-form", "responses", "admin-chosen-id"),
      { ...responsePayload(), submitted_by_uid: "admin-uid" },
    ),
  );
});

await t("既有回覆仍禁止直接更新或刪除", async () => {
  const db = userContext(STUDENT_UID).firestore();
  const response = doc(
    db,
    "forms",
    "open-form",
    "responses",
    "server-created",
  );
  await assertFails(updateDoc(response, { answers: { note: "changed" } }));
  await assertFails(deleteDoc(response));
});

await t("提交者仍可讀取伺服器建立的回覆", async () => {
  const db = userContext(STUDENT_UID).firestore();
  await assertSucceeds(
    getDoc(doc(db, "forms", "open-form", "responses", "server-created")),
  );
});

await t("其他學生不可讀取回覆", async () => {
  const db = userContext(OTHER_UID).firestore();
  await assertFails(
    getDoc(doc(db, "forms", "open-form", "responses", "server-created")),
  );
});

await t("管理員仍可讀取回覆", async () => {
  const db = userContext("admin-uid", "admin").firestore();
  await assertSucceeds(
    getDoc(doc(db, "forms", "open-form", "responses", "server-created")),
  );
});

await testEnv.cleanup();
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
