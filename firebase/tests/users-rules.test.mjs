import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

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
const STUDENT_EMAIL = "student@gs.ncku.edu.tw";

function studentCtx() {
  return testEnv.authenticatedContext(STUDENT_UID, {
    email: STUDENT_EMAIL,
    email_verified: true,
    // 一般學生：custom claims 只有 club_member（或完全沒有 role）
    role: "club_member",
  });
}

let pass = 0;
let fail = 0;
async function t(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    fail++;
    console.log(`  ❌ ${name}\n     → ${e.message?.split("\n")[0]}`);
  }
}

console.log(`\n=== Rules under test: ${rulesFile} ===\n`);

await testEnv.clearFirestore();
// 種一個 active 社團，供合法路徑測試使用
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), "clubs/club-a"), {
    name: "測試社",
    is_active: true,
  });
});

console.log("[攻擊情境] 一般學生自行建立 users 文件");

await t("EXPLOIT-1: 學生建立自己的 users 文件並塞 role:'admin' 應被拒絕", async () => {
  const db = studentCtx().firestore();
  await assertFails(
    setDoc(doc(db, "users", STUDENT_UID), {
      uid: STUDENT_UID,
      email: STUDENT_EMAIL,
      role: "admin",
      display_name: "壞學生",
      club_id: "",
      profile_completed: true,
      created_at: serverTimestamp(),
    })
  );
});

await t("EXPLOIT-2: 學生 create 時夾帶未知欄位（如 is_super）應被拒絕", async () => {
  await testEnv.clearFirestore();
  const db = studentCtx().firestore();
  await assertFails(
    setDoc(doc(db, "users", STUDENT_UID), {
      uid: STUDENT_UID,
      email: STUDENT_EMAIL,
      role: "club_member",
      display_name: "壞學生",
      is_super: true,
    })
  );
});

await t("EXPLOIT-3: 學生 create 時綁不存在/停用的 club_id 應被拒絕", async () => {
  await testEnv.clearFirestore();
  const db = studentCtx().firestore();
  await assertFails(
    setDoc(doc(db, "users", STUDENT_UID), {
      uid: STUDENT_UID,
      email: STUDENT_EMAIL,
      role: "club_member",
      display_name: "壞學生",
      club_id: "club-not-exist",
    })
  );
});

console.log("\n[既有防護] update 路徑（應該本來就擋得住）");

await t("EXPLOIT-4: 學生 update 自己的 role 應被拒絕", async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users", STUDENT_UID), {
      uid: STUDENT_UID,
      email: STUDENT_EMAIL,
      role: "club_member",
      display_name: "好學生",
    });
  });
  const db = studentCtx().firestore();
  await assertFails(updateDoc(doc(db, "users", STUDENT_UID), { role: "admin" }));
});

await t("EXPLOIT-5: 學生不可讀取他人 users 文件", async () => {
  const db = studentCtx().firestore();
  await assertFails(getDoc(doc(db, "users", "someone-else")));
});

console.log("\n[正常流程] 不可被誤殺");

await t("OK-1: 學生首次建立自己的 users 文件（role: club_member）應成功", async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "clubs/club-a"), { name: "測試社", is_active: true });
  });
  const db = studentCtx().firestore();
  await assertSucceeds(
    setDoc(doc(db, "users", STUDENT_UID), {
      uid: STUDENT_UID,
      email: STUDENT_EMAIL,
      role: "club_member",
      created_at: serverTimestamp(),
      display_name: "好學生",
      club_id: "club-a",
      position_title: "社長",
      department_grade: "資工三",
      profile_completed: true,
    })
  );
});

await t("OK-2: 建立後可更新 display_name", async () => {
  const db = studentCtx().firestore();
  await assertSucceeds(
    updateDoc(doc(db, "users", STUDENT_UID), { display_name: "改名字" })
  );
});

await t("OK-3: club_id 可留空（尚未選社）", async () => {
  await testEnv.clearFirestore();
  const db = studentCtx().firestore();
  await assertSucceeds(
    setDoc(doc(db, "users", STUDENT_UID), {
      uid: STUDENT_UID,
      email: STUDENT_EMAIL,
      role: "club_member",
      created_at: serverTimestamp(),
      display_name: "好學生",
      club_id: "",
      profile_completed: false,
    })
  );
});

await t("OK-4: club_id 可為 none（無社團）", async () => {
  await testEnv.clearFirestore();
  const db = studentCtx().firestore();
  await assertSucceeds(
    setDoc(doc(db, "users", STUDENT_UID), {
      uid: STUDENT_UID,
      email: STUDENT_EMAIL,
      role: "club_member",
      created_at: serverTimestamp(),
      display_name: "好學生",
      club_id: "none",
      profile_completed: true,
    })
  );
});

await t("OK-5: 學生可讀自己的 users 文件", async () => {
  const db = studentCtx().firestore();
  await assertSucceeds(getDoc(doc(db, "users", STUDENT_UID)));
});


await t("OK-6: 建立後可把 club_id 改成 none（清除社團）", async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "clubs/club-a"), { name: "測試社", is_active: true });
    await setDoc(doc(ctx.firestore(), "users", STUDENT_UID), {
      uid: STUDENT_UID, email: STUDENT_EMAIL, role: "club_member",
      display_name: "好學生", club_id: "club-a",
    });
  });
  const db = studentCtx().firestore();
  await assertSucceeds(
    updateDoc(doc(db, "users", STUDENT_UID), { display_name: "好學生", club_id: "none" })
  );
});

await t("OK-7: 建立後可把 club_id 改成合法社團", async () => {
  const db = studentCtx().firestore();
  await assertSucceeds(
    updateDoc(doc(db, "users", STUDENT_UID), { display_name: "好學生", club_id: "club-a" })
  );
});

await t("EXPLOIT-6: 學生 update 時不可綁不存在的社團", async () => {
  const db = studentCtx().firestore();
  await assertFails(
    updateDoc(doc(db, "users", STUDENT_UID), { display_name: "好學生", club_id: "ghost-club" })
  );
});

await t("EXPLOIT-7: 學生刪除自己的文件後再 create 提權，仍應被拒絕", async () => {
  await testEnv.clearFirestore();
  const db = studentCtx().firestore();
  await assertFails(
    setDoc(doc(db, "users", STUDENT_UID), {
      uid: STUDENT_UID, email: STUDENT_EMAIL, role: "admin", display_name: "壞學生",
    })
  );
});

await t("EXPLOIT-8: 學生不可替他人建立 users 文件", async () => {
  const db = studentCtx().firestore();
  await assertFails(
    setDoc(doc(db, "users", "victim-uid"), {
      uid: "victim-uid", email: STUDENT_EMAIL, role: "club_member", display_name: "x",
    })
  );
});

await testEnv.cleanup();
console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
