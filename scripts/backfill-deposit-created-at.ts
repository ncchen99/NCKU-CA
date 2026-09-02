/**
 * 回填保證金紀錄的 created_at（與缺漏的 form_id）
 *
 * 早期的 deposit_records 建立時沒有寫入 created_at，導致「待繳」的紀錄
 * 在後台完全沒有時間資訊，同一社團跨學期的多筆保證金無法分辨先後。
 * 本腳本以綁定回覆的 submitted_at 作為 created_at 回填；
 * 順帶補上只有 form_response_id、缺少 form_id 的紀錄（後台會顯示「已綁定（表單名稱未知）」）。
 *
 * 使用方式:
 *   cd web && npx tsx ../scripts/backfill-deposit-created-at.ts          # 預覽（不寫入）
 *   cd web && npx tsx ../scripts/backfill-deposit-created-at.ts --apply  # 實際寫入
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const webRequire = createRequire(resolve(PROJECT_ROOT, "web", "package.json"));
const firebaseAdmin = webRequire("firebase-admin/app") as typeof import("firebase-admin/app");
const firebaseFirestore = webRequire("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
const { initializeApp, cert } = firebaseAdmin;
const { getFirestore } = firebaseFirestore;

const APPLY = process.argv.includes("--apply");

function loadEnv(envPath: string): void {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eqIdx + 1).trim();
  }
}

function initFirebase() {
  const base64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64;
  if (!base64) {
    throw new Error("缺少環境變數 FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64，請檢查 web/.env");
  }
  const serviceAccount = JSON.parse(Buffer.from(base64, "base64").toString("utf-8"));
  return getFirestore(initializeApp({ credential: cert(serviceAccount) }));
}

type ResponseMeta = { formId: string; formTitle: string; submittedAt?: FirebaseFirestore.Timestamp };

async function main() {
  loadEnv(resolve(PROJECT_ROOT, "web", ".env"));
  const db = initFirebase();

  // response_id → 所屬表單與送出時間（保證金紀錄可能沒存 form_id，統一從回覆端建索引）
  const metaByResponseId = new Map<string, ResponseMeta>();
  const formsSnapshot = await db.collection("forms").get();
  for (const formDoc of formsSnapshot.docs) {
    const formTitle = String(formDoc.data().title ?? formDoc.id);
    const responsesSnapshot = await formDoc.ref.collection("responses").get();
    for (const responseDoc of responsesSnapshot.docs) {
      const submittedAt = responseDoc.data().submitted_at;
      metaByResponseId.set(responseDoc.id, {
        formId: formDoc.id,
        formTitle,
        submittedAt: submittedAt ?? undefined,
      });
    }
  }

  const depositsSnapshot = await db.collection("deposit_records").get();

  let createdAtUpdates = 0;
  let formIdUpdates = 0;
  const unresolved: Array<{ id: string; reason: string }> = [];

  for (const depositDoc of depositsSnapshot.docs) {
    const data = depositDoc.data() as {
      created_at?: unknown;
      form_id?: string;
      form_response_id?: string;
      paid_at?: FirebaseFirestore.Timestamp;
      club_id?: string;
    };

    const update: Record<string, unknown> = {};
    const responseId = data.form_response_id;
    const meta = responseId ? metaByResponseId.get(responseId) : undefined;

    if (!data.created_at) {
      // 優先用綁定回覆的送出時間；沒有綁定就退而求其次用繳費時間。
      const fallback = meta?.submittedAt ?? data.paid_at;
      if (fallback) {
        update.created_at = fallback;
      } else {
        unresolved.push({
          id: depositDoc.id,
          reason: responseId
            ? `找不到綁定回覆 ${responseId}，且無 paid_at`
            : "沒有綁定回覆，且無 paid_at（需人工填寫建立日期）",
        });
      }
    }

    if (!data.form_id && meta) {
      update.form_id = meta.formId;
    }

    if (Object.keys(update).length === 0) continue;

    const parts: string[] = [];
    if (update.created_at) {
      const ts = update.created_at as FirebaseFirestore.Timestamp;
      parts.push(`created_at=${ts.toDate().toISOString().slice(0, 10)}`);
      createdAtUpdates += 1;
    }
    if (update.form_id) {
      parts.push(`form_id=${update.form_id}（${meta?.formTitle}）`);
      formIdUpdates += 1;
    }
    console.log(`[保證金] ${depositDoc.id} (${data.club_id ?? "?"}) → ${parts.join(", ")}`);

    if (APPLY) await depositDoc.ref.update(update);
  }

  if (unresolved.length > 0) {
    console.log("\n⚠️  以下紀錄無法推得建立日期，需人工確認：");
    for (const item of unresolved) {
      console.log(`   ${item.id}：${item.reason}`);
    }
  }

  console.log(
    `\n${APPLY ? "✅ 已寫入" : "🔍 預覽（未寫入，加上 --apply 才會實際更新）"}：` +
      `created_at ${createdAtUpdates} 筆、form_id ${formIdUpdates} 筆，無法自動處理 ${unresolved.length} 筆。`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
