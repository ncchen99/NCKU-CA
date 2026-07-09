/**
 * Firestore 資料種子腳本
 *
 * 將格式化的 markdown 檔案寫入 site_content 集合，
 * 並將社團 YAML 資料寫入 clubs 集合。
 *
 * 使用方式:
 *   cd web && npm run seed
 *   或: cd web && npx tsx ../scripts/seed-firestore.ts
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

// firebase-admin 與 js-yaml 安裝在 web/node_modules，
// 因此需要用 createRequire 從 web/ 目錄解析模組。
const webRequire = createRequire(resolve(PROJECT_ROOT, "web", "package.json"));

const firebaseAdmin = webRequire("firebase-admin/app") as typeof import("firebase-admin/app");
const firebaseFirestore = webRequire("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
const yaml = webRequire("js-yaml") as typeof import("js-yaml");

const { initializeApp, cert } = firebaseAdmin;
const { getFirestore, FieldValue } = firebaseFirestore;

type WriteBatch = FirebaseFirestore.WriteBatch;

// ---------------------------------------------------------------------------
// .env 載入（手動解析，避免額外依賴）
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Firebase Admin 初始化
// ---------------------------------------------------------------------------
function initFirebase() {
  const base64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64;
  if (!base64) {
    throw new Error(
      "缺少環境變數 FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64，請檢查 web/.env"
    );
  }
  const serviceAccount = JSON.parse(
    Buffer.from(base64, "base64").toString("utf-8")
  );
  const app = initializeApp({ credential: cert(serviceAccount) });
  return getFirestore(app);
}

// ---------------------------------------------------------------------------
// site_content 寫入
// ---------------------------------------------------------------------------

interface SiteContentEntry {
  docId: string;
  title: string;
  filename: string;
  metadata?: Record<string, unknown>;
}

const SITE_CONTENT_MAP: SiteContentEntry[] = [
  {
    docId: "about",
    title: "關於社聯會",
    filename: "關於社聯會.md",
  },
  {
    docId: "charter",
    title: "本會組織章程",
    filename: "本會組織章程.md",
  },
  {
    docId: "election-rules",
    title: "本會選舉罷免辦法",
    filename: "本會選舉罷免辦法.md",
  },
  {
    docId: "activity-center-rules",
    title: "國立成功大學學生活動中心暨芸青軒管理辦法",
    filename: "國立成功大學學生活動中心暨芸青軒管理辦法.md",
  },
];

async function seedSiteContent(db: FirebaseFirestore.Firestore) {
  console.log("\n📄 開始寫入 site_content 集合...");
  const batch = db.batch();

  for (const entry of SITE_CONTENT_MAP) {
    const filePath = resolve(PROJECT_ROOT, "data", "formatted", entry.filename);
    const markdown = readFileSync(filePath, "utf-8");

    const ref = db.collection("site_content").doc(entry.docId);
    batch.set(ref, {
      id: entry.docId,
      title: entry.title,
      content_markdown: markdown,
      ...(entry.metadata ? { metadata: entry.metadata } : {}),
      updated_at: FieldValue.serverTimestamp(),
      updated_by: "system-seed",
    });
    console.log(`  ✅ ${entry.docId} ← ${entry.filename}`);
  }

  const membersRef = db.collection("site_content").doc("members");
  batch.set(membersRef, {
    id: "members",
    title: "幹部成員",
    content_markdown:
      "# 幹部成員\n\n本頁列出社聯會現任幹部成員名單，包含會長、各部門部長及主席團成員。\n\n（資料待更新）\n",
    metadata: {
      sections: ["president", "secretariat", "finance", "activities", "venues"],
    },
    updated_at: FieldValue.serverTimestamp(),
    updated_by: "system-seed",
  });
  console.log("  ✅ members ← 幹部成員（預留頁面）");

  await batch.commit();
  console.log("📄 site_content 寫入完成（共 5 筆文件）");
}

// ---------------------------------------------------------------------------
// clubs 寫入
// ---------------------------------------------------------------------------

interface YamlClub {
  id: string;
  platform_id?: string;
  name: string;
  name_en?: string;
  category: string;
  category_code: string;
  status?: string;
  email?: string;
  description?: string | null;
  goal?: string | null;
  website_url?: string | null;
  regular_activity_time?: string | null;
  main_activity_location?: string | null;
  import_source?: string;
  raw_data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface YamlRoot {
  meta: Record<string, unknown>;
  clubs: YamlClub[];
}

const BATCH_LIMIT = 500;

async function commitBatch(batch: WriteBatch, label: string) {
  await batch.commit();
  console.log(`  💾 ${label}`);
}

async function seedClubs(db: FirebaseFirestore.Firestore) {
  console.log("\n🏫 開始寫入 clubs 集合...");
  const yamlPath = resolve(PROJECT_ROOT, "data", "ncku-clubs.yaml");
  const yamlContent = readFileSync(yamlPath, "utf-8");
  const data = yaml.load(yamlContent) as YamlRoot;

  if (!data?.clubs?.length) {
    console.error("❌ YAML 檔案中找不到 clubs 資料");
    return;
  }

  // 載入自訂社團/組織
  const customYamlPath = resolve(PROJECT_ROOT, "data", "custom-clubs.yaml");
  let customClubs: YamlClub[] = [];
  if (existsSync(customYamlPath)) {
    try {
      const customContent = readFileSync(customYamlPath, "utf-8");
      const customData = yaml.load(customContent) as YamlRoot;
      if (customData?.clubs?.length) {
        customClubs = customData.clubs;
        console.log(`  ➕ 載入 ${customClubs.length} 個自訂社團/組織`);
      }
    } catch (e) {
      console.warn("⚠️ 無法解析自訂社團 YAML 檔案:", e);
    }
  }

  const allClubs = [...data.clubs, ...customClubs];
  console.log(`  📊 共找到 ${allClubs.length} 個社團（含自訂）`);

  let batch = db.batch();
  let batchCount = 0;
  let totalWritten = 0;

  for (const club of allClubs) {
    if (batchCount >= BATCH_LIMIT) {
      await commitBatch(batch, `已寫入 ${totalWritten} / ${allClubs.length}`);
      batch = db.batch();
      batchCount = 0;
    }

    const ref = db.collection("clubs").doc(club.id);
    batch.set(ref, {
      id: club.id,
      name: club.name,
      ...(club.name_en ? { name_en: club.name_en } : {}),
      category: club.category,
      category_code: club.category_code,
      ...(club.status ? { status: club.status } : {}),
      ...(club.email ? { email: club.email } : {}),
      ...(club.description ? { description: club.description } : {}),
      ...(club.website_url ? { website_url: club.website_url } : {}),
      is_active: club.status === "正式",
      import_source: club.import_source ?? ("yaml_import" as const),
      raw_data: club.raw_data ?? {},
      imported_at: FieldValue.serverTimestamp(),
    });

    batchCount++;
    totalWritten++;
  }

  if (batchCount > 0) {
    await commitBatch(batch, `已寫入 ${totalWritten} / ${allClubs.length}`);
  }

  console.log(`🏫 clubs 寫入完成（共 ${totalWritten} 筆文件）`);
}

// ---------------------------------------------------------------------------
// 主程式
// ---------------------------------------------------------------------------
async function main() {
  console.log("🚀 NCKU CA Firestore 種子腳本啟動");
  console.log("=".repeat(50));

  const envPath = resolve(PROJECT_ROOT, "web", ".env");
  console.log(`📂 載入環境變數: ${envPath}`);
  loadEnv(envPath);

  const db = initFirebase();
  console.log("🔥 Firebase Admin SDK 初始化成功");

  const clubsOnly = process.argv.includes("--clubs-only");

  if (!clubsOnly) {
    await seedSiteContent(db);
  } else {
    console.log("\n⚠️ 已啟用 --clubs-only 參數，跳過 site_content 集合的寫入");
  }
  await seedClubs(db);

  console.log("\n" + "=".repeat(50));
  console.log("✅ 所有資料寫入完成！");
}

main().catch((err) => {
  console.error("❌ 種子腳本執行失敗:", err);
  process.exit(1);
});
