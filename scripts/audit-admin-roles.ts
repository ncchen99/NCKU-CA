/**
 * 管理員權限稽核腳本（唯讀，不會修改任何資料）
 *
 * 用途：排查是否有人利用 issue #1 的 Firestore Rules 漏洞，
 *      自行建立 role: "admin" 的 users 文件來提權。
 *
 * 檢查項目：
 *   1. Firestore users 集合中所有 role == "admin" 的文件
 *   2. Firebase Auth 中所有 custom claims role == "admin" 的帳號
 *   3. 兩者不一致之處（最可疑：有 Firestore role=admin 但沒有 custom claims，
 *      代表這個 admin 不是透過後台正常流程設定的）
 *
 * 使用方式:
 *   cd web && npx tsx ../scripts/audit-admin-roles.ts
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const webRequire = createRequire(resolve(PROJECT_ROOT, "web", "package.json"));

const firebaseAdmin = webRequire("firebase-admin/app") as typeof import("firebase-admin/app");
const firebaseAuth = webRequire("firebase-admin/auth") as typeof import("firebase-admin/auth");
const firebaseFirestore = webRequire("firebase-admin/firestore") as typeof import("firebase-admin/firestore");

const { initializeApp, cert } = firebaseAdmin;
const { getAuth } = firebaseAuth;
const { getFirestore } = firebaseFirestore;

function loadEnv(envPath: string): void {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function initFirebase() {
  const base64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64;
  if (!base64) {
    throw new Error("缺少環境變數 FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64");
  }
  const serviceAccount = JSON.parse(
    Buffer.from(base64, "base64").toString("utf-8")
  );
  const app = initializeApp({ credential: cert(serviceAccount) });
  return { db: getFirestore(app), auth: getAuth(app) };
}

interface AdminEntry {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  firestoreAdmin: boolean;
  claimsAdmin: boolean;
}

async function main() {
  loadEnv(resolve(PROJECT_ROOT, "web", ".env"));
  const { db, auth } = initFirebase();

  const entries = new Map<string, AdminEntry>();

  function entryFor(uid: string): AdminEntry {
    let e = entries.get(uid);
    if (!e) {
      e = {
        uid,
        email: "",
        displayName: "",
        createdAt: "",
        firestoreAdmin: false,
        claimsAdmin: false,
      };
      entries.set(uid, e);
    }
    return e;
  }

  // 1. Firestore users 中的 admin
  console.log("🔍 掃描 Firestore users 集合...");
  const snap = await db.collection("users").where("role", "==", "admin").get();
  for (const doc of snap.docs) {
    const data = doc.data();
    const e = entryFor(doc.id);
    e.firestoreAdmin = true;
    e.email = (data.email as string) ?? "";
    e.displayName = (data.display_name as string) ?? "";
    const created = data.created_at;
    if (created && typeof created.toDate === "function") {
      e.createdAt = created.toDate().toISOString();
    }
  }
  console.log(`   找到 ${snap.size} 筆 role == "admin" 的文件`);

  // 2. Firebase Auth custom claims 中的 admin
  console.log("🔍 掃描 Firebase Auth custom claims...");
  let total = 0;
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    total += page.users.length;
    for (const u of page.users) {
      if (u.customClaims?.role === "admin") {
        const e = entryFor(u.uid);
        e.claimsAdmin = true;
        if (!e.email) e.email = u.email ?? "";
        if (!e.displayName) e.displayName = u.displayName ?? "";
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`   掃描 ${total} 個帳號`);

  // 3. 輸出結果
  const all = [...entries.values()].sort((a, b) => a.uid.localeCompare(b.uid));
  const suspicious = all.filter((e) => e.firestoreAdmin && !e.claimsAdmin);
  const claimsOnly = all.filter((e) => !e.firestoreAdmin && e.claimsAdmin);
  const consistent = all.filter((e) => e.firestoreAdmin && e.claimsAdmin);

  console.log("\n══════════════════════════════════════════════");
  console.log(`✅ 一致的管理員（Firestore + Custom Claims 皆為 admin）：${consistent.length}`);
  for (const e of consistent) {
    console.log(`   - ${e.uid}  ${e.email}  ${e.displayName}  建立於 ${e.createdAt || "未知"}`);
  }

  console.log(`\n🚨 可疑：只有 Firestore role=admin，沒有 Custom Claims：${suspicious.length}`);
  if (suspicious.length === 0) {
    console.log("   （無，沒有發現自提權跡象）");
  } else {
    console.log("   這些帳號很可能是繞過後台直接寫入 Firestore 取得的，請逐一確認！");
    for (const e of suspicious) {
      console.log(`   - ${e.uid}  ${e.email}  ${e.displayName}  建立於 ${e.createdAt || "未知"}`);
    }
  }

  console.log(`\n⚠️  只有 Custom Claims=admin，Firestore 未標記：${claimsOnly.length}`);
  if (claimsOnly.length === 0) {
    console.log("   （無）");
  } else {
    console.log("   修復後 verifyAdmin() 要求兩者一致，這些帳號會失去後台權限，請補上 Firestore 文件。");
    for (const e of claimsOnly) {
      console.log(`   - ${e.uid}  ${e.email}  ${e.displayName}`);
    }
  }
  console.log("══════════════════════════════════════════════\n");

  if (suspicious.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("❌ 稽核失敗:", err);
  process.exit(1);
});
