/**
 * 同步 Firestore 中由舊合併模板建立的表單文案。
 *
 * 目標：
 * 1. 將 expo_registration 與 winter_association_registration 的舊合併描述，
 *    分別更新為拆分後的獨立描述。
 * 2. 將舊模板名稱「社博 / 寒假場協報名」依 form_type 改為對應新名稱。
 *
 * 使用方式:
 *   cd web && npx tsx ../scripts/sync-form-template-split.ts
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
const firebaseFirestore = webRequire("firebase-admin/firestore") as typeof import("firebase-admin/firestore");

const { initializeApp, cert } = firebaseAdmin;
const { getFirestore } = firebaseFirestore;

const OLD_COMBINED_TITLE = "社博 / 寒假場協報名";
const OLD_COMBINED_DESCRIPTION =
  "含保證金收退流程的活動報名表單。適用於社團博覽會及寒假場地協調。";

const TEMPLATE_PATCH: Record<
  string,
  { title: string; description: string }
> = {
  expo_registration: {
    title: "社團博覽會報名",
    description: "社團博覽會專用報名模板，含保證金收退流程。",
  },
  winter_association_registration: {
    title: "寒假場協報名",
    description: "寒假場協專用報名模板，含保證金收退流程。",
  },
};

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
    throw new Error("缺少環境變數 FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64，請檢查 web/.env");
  }

  const serviceAccount = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
  const app = initializeApp({ credential: cert(serviceAccount) });
  return getFirestore(app);
}

async function main() {
  console.log("🚀 開始同步拆分後模板文案到 Firestore forms...");

  const envPath = resolve(PROJECT_ROOT, "web", ".env");
  loadEnv(envPath);

  const db = initFirebase();
  const snapshot = await db.collection("forms").get();

  let scanned = 0;
  let updated = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data() as {
      form_type?: string;
      title?: string;
      description?: string;
    };

    const formType = data.form_type;
    if (!formType || !(formType in TEMPLATE_PATCH)) continue;

    const next = TEMPLATE_PATCH[formType];
    const patch: Record<string, unknown> = {};

    if (data.title === OLD_COMBINED_TITLE) {
      patch.title = next.title;
    }

    if (data.description === OLD_COMBINED_DESCRIPTION) {
      patch.description = next.description;
    }

    if (Object.keys(patch).length === 0) continue;

    await doc.ref.update(patch);
    updated += 1;
    console.log(`  ✅ 已更新 forms/${doc.id}: ${Object.keys(patch).join(", ")}`);
  }

  console.log(`\n📊 掃描 ${scanned} 筆 forms，更新 ${updated} 筆。`);
}

main().catch((err) => {
  console.error("❌ 同步失敗:", err);
  process.exit(1);
});
