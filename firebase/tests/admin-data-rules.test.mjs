import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
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

function studentContext() {
  return testEnv.authenticatedContext("student-uid", {
    email: "student@gs.ncku.edu.tw",
    email_verified: true,
    role: "club_member",
  });
}

function adminContext() {
  return testEnv.authenticatedContext("admin-uid", {
    email: "admin@gs.ncku.edu.tw",
    email_verified: true,
    role: "admin",
  });
}

function staleAdminContext() {
  return testEnv.authenticatedContext("stale-admin-uid", {
    email: "stale-admin@gs.ncku.edu.tw",
    email_verified: true,
    role: "admin",
  });
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

console.log(`\n=== Admin data rules: ${rulesFile} ===\n`);

await testEnv.clearFirestore();
await testEnv.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await Promise.all([
    setDoc(doc(db, "users", "admin-uid"), {
      uid: "admin-uid",
      role: "admin",
    }),
    setDoc(doc(db, "users", "stale-admin-uid"), {
      uid: "stale-admin-uid",
      role: "club_member",
    }),
    setDoc(doc(db, "forms", "open-form"), { status: "open", fields: [] }),
    setDoc(doc(db, "forms", "closed-form"), { status: "closed", fields: [] }),
    setDoc(doc(db, "forms", "draft-form"), {
      status: "draft",
      description: "private draft",
      fields: [{ id: "private-field" }],
    }),
    setDoc(doc(db, "attendance_events", "open-event"), {
      status: "open",
      passcode: "secret-passcode",
    }),
    setDoc(
      doc(db, "attendance_events", "open-event", "records", "server-created"),
      {
        user_uid: "student-uid",
        club_id: "club-a",
        checked_in_at: serverTimestamp(),
        is_duplicate_attempt: false,
      },
    ),
  ]);
});

await t("匿名使用者可讀取開放表單", async () => {
  await assertSucceeds(
    getDoc(doc(testEnv.unauthenticatedContext().firestore(), "forms", "open-form")),
  );
});

await t("匿名與一般學生皆不可讀取草稿表單", async () => {
  await assertFails(
    getDoc(doc(testEnv.unauthenticatedContext().firestore(), "forms", "draft-form")),
  );
  await assertFails(
    getDoc(doc(studentContext().firestore(), "forms", "draft-form")),
  );
});

await t("一般學生仍可讀取已關閉表單的歷史資料", async () => {
  await assertSucceeds(
    getDoc(doc(studentContext().firestore(), "forms", "closed-form")),
  );
});

await t("一般學生不可列出可能包含草稿的全部表單", async () => {
  await assertFails(getDocs(collection(studentContext().firestore(), "forms")));
  await assertSucceeds(
    getDocs(
      query(
        collection(testEnv.unauthenticatedContext().firestore(), "forms"),
        where("status", "==", "open"),
      ),
    ),
  );
});

await t("管理員可讀取草稿表單", async () => {
  await assertSucceeds(
    getDoc(doc(adminContext().firestore(), "forms", "draft-form")),
  );
});

await t("已降權但仍持有舊 admin claim 的使用者不可讀取後台資料", async () => {
  const db = staleAdminContext().firestore();
  await assertFails(getDoc(doc(db, "forms", "draft-form")));
  await assertFails(getDoc(doc(db, "attendance_events", "open-event")));
});

await t("匿名與一般學生不可讀取含密碼的點名事件", async () => {
  await assertFails(
    getDoc(
      doc(
        testEnv.unauthenticatedContext().firestore(),
        "attendance_events",
        "open-event",
      ),
    ),
  );
  await assertFails(
    getDoc(doc(studentContext().firestore(), "attendance_events", "open-event")),
  );
});

await t("管理員可讀取點名事件", async () => {
  await assertSucceeds(
    getDoc(doc(adminContext().firestore(), "attendance_events", "open-event")),
  );
});

await t("學生不可繞過密碼直接建立點名紀錄", async () => {
  const db = studentContext().firestore();
  await assertFails(
    setDoc(doc(db, "attendance_events", "open-event", "records", "forged"), {
      user_uid: "student-uid",
      club_id: "club-a",
      checked_in_at: serverTimestamp(),
      is_duplicate_attempt: false,
    }),
  );
});

await t("學生仍可讀取自己的伺服器端點名紀錄", async () => {
  await assertSucceeds(
    getDoc(
      doc(
        studentContext().firestore(),
        "attendance_events",
        "open-event",
        "records",
        "server-created",
      ),
    ),
  );
});

await testEnv.cleanup();
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
