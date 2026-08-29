/**
 * 回填 club_name_custom（使用者自填的社團名稱）
 *
 * 不在 clubs 名單內的單位（試辦社團、學生組織等）填表時 club_id 會是 "none"，
 * 導致表單回覆與保證金管理的社團欄位顯示為 none。
 * 本腳本把這些回覆中使用者自填的「社團名稱」欄位值，
 * 寫回 responses 與其綁定的 deposit_records 的 club_name_custom 欄位。
 *
 * 使用方式:
 *   cd web && npx tsx ../scripts/backfill-club-name-custom.ts          # 預覽（不寫入）
 *   cd web && npx tsx ../scripts/backfill-club-name-custom.ts --apply  # 實際寫入
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

import {
  extractCustomClubName,
  findClubNameField,
  isUnresolvedClubId,
} from "@/lib/club-name";
import type { FormField } from "@/types";

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

async function main() {
  loadEnv(resolve(PROJECT_ROOT, "web", ".env"));
  const db = initFirebase();

  const clubsSnapshot = await db.collection("clubs").get();
  const clubNameById = new Map<string, string>();
  for (const doc of clubsSnapshot.docs) {
    const name = doc.data().name;
    if (typeof name === "string" && name) clubNameById.set(doc.id, name);
  }

  // form_response_id → 保證金紀錄
  const depositsSnapshot = await db.collection("deposit_records").get();
  const depositsByResponseId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const doc of depositsSnapshot.docs) {
    const responseId = doc.data().form_response_id;
    if (typeof responseId !== "string" || !responseId) continue;
    const list = depositsByResponseId.get(responseId) ?? [];
    list.push(doc);
    depositsByResponseId.set(responseId, list);
  }

  const formsSnapshot = await db.collection("forms").get();

  let responseUpdates = 0;
  let depositUpdates = 0;
  const unresolved: Array<{
    form: string;
    responseId: string;
    uid: string;
    hint: string;
  }> = [];

  for (const formDoc of formsSnapshot.docs) {
    const formData = formDoc.data() as { title?: string; fields?: FormField[] };
    const fields = formData.fields ?? [];
    // 沒有社團名稱欄位的表單（例如「聯絡我們」）無從回填，直接略過
    if (!findClubNameField(fields)) continue;

    const responsesSnapshot = await formDoc.ref.collection("responses").get();

    for (const responseDoc of responsesSnapshot.docs) {
      const data = responseDoc.data() as {
        club_id?: string;
        club_name_custom?: string;
        answers?: Record<string, unknown>;
        submitted_by_uid?: string;
      };

      if (!isUnresolvedClubId(data.club_id)) continue;

      const customName = extractCustomClubName(fields, data.answers);
      const linkedDeposits = depositsByResponseId.get(responseDoc.id) ?? [];

      if (!customName) {
        unresolved.push({
          form: formData.title ?? formDoc.id,
          responseId: responseDoc.id,
          uid: data.submitted_by_uid ?? "?",
          hint: String(data.answers?.notes ?? "").replace(/\s+/g, " ").slice(0, 60),
        });
        continue;
      }

      const display = clubNameById.get(customName) ?? customName;

      if (data.club_name_custom !== customName) {
        console.log(
          `[回覆] ${formData.title ?? formDoc.id} / ${responseDoc.id} → club_name_custom="${customName}"` +
            (display !== customName ? `（顯示為「${display}」）` : ""),
        );
        if (APPLY) await responseDoc.ref.update({ club_name_custom: customName });
        responseUpdates += 1;
      }

      for (const depositDoc of linkedDeposits) {
        if (depositDoc.data().club_name_custom === customName) continue;
        console.log(`[保證金] ${depositDoc.id} → club_name_custom="${customName}"`);
        if (APPLY) await depositDoc.ref.update({ club_name_custom: customName });
        depositUpdates += 1;
      }
    }
  }

  if (unresolved.length > 0) {
    console.log("\n⚠️  以下回覆無法自動取得社團名稱（自填欄位為空或為 none），需人工確認：");
    for (const item of unresolved) {
      console.log(`   ${item.form} / ${item.responseId} (uid=${item.uid})${item.hint ? ` 補充說明：${item.hint}` : ""}`);
    }
  }

  console.log(
    `\n${APPLY ? "✅ 已寫入" : "🔍 預覽（未寫入，加上 --apply 才會實際更新）"}：` +
      `回覆 ${responseUpdates} 筆、保證金 ${depositUpdates} 筆，無法自動處理 ${unresolved.length} 筆。`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
