/**
 * 為既有表單補上「自填社團名稱」欄位
 *
 * 將表單中的社團名稱欄位轉為 club_picker（若尚未是），
 * 並在其後插入條件顯示的自填欄位 club_name_custom
 * （depends_on: club_picker === "none"）。
 *
 * 不在 clubs 名單內的單位（試辦社團、學生組織等）選「無」後，
 * 才需要也才必須填寫此欄位，其值會成為表單回覆與保證金紀錄的社團名稱。
 *
 * 新建立的表單由 web/src/lib/form-templates.ts 統一帶入此設計，
 * 本腳本僅用於補救設計導入前既有的表單。
 *
 * 使用方式:
 *   cd web && npx tsx ../scripts/add-custom-club-name-field.ts                # 預覽全部表單
 *   cd web && npx tsx ../scripts/add-custom-club-name-field.ts --apply        # 實際寫入
 *   cd web && npx tsx ../scripts/add-custom-club-name-field.ts <formId> --apply
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

import {
  CUSTOM_CLUB_NAME_FIELD_ID,
  NO_CLUB_ID,
  findClubNameField,
} from "@/lib/club-name";
import type { FormField } from "@/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const webRequire = createRequire(resolve(PROJECT_ROOT, "web", "package.json"));
const firebaseAdmin = webRequire("firebase-admin/app") as typeof import("firebase-admin/app");
const firebaseFirestore = webRequire("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
const { initializeApp, cert } = firebaseAdmin;
const { getFirestore } = firebaseFirestore;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const TARGET_FORM_ID = args.find((a) => !a.startsWith("--"));

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

function buildCustomField(clubPickerFieldId: string): FormField {
  return {
    id: CUSTOM_CLUB_NAME_FIELD_ID,
    type: "text",
    label: "社團／組織名稱（未在名單中請填寫）",
    placeholder: "例如：匹克球社（試辦）、成杏合唱團",
    required: true,
    depends_on: {
      field_id: clubPickerFieldId,
      operator: "equals",
      value: NO_CLUB_ID,
      action: "show",
    },
    order: 0, // 後續統一重編
  };
}

async function main() {
  loadEnv(resolve(PROJECT_ROOT, "web", ".env"));
  const db = initFirebase();

  const formDocs = TARGET_FORM_ID
    ? [await db.collection("forms").doc(TARGET_FORM_ID).get()]
    : (await db.collection("forms").get()).docs;

  let changed = 0;

  for (const formDoc of formDocs) {
    if (!formDoc.exists) {
      console.log(`⚠️  查無表單 ${formDoc.id}`);
      continue;
    }
    const data = formDoc.data() as { title?: string; fields?: FormField[] };
    const fields = [...(data.fields ?? [])];
    const label = `${data.title ?? formDoc.id} (${formDoc.id})`;

    if (fields.some((f) => f.id === CUSTOM_CLUB_NAME_FIELD_ID)) {
      console.log(`⏭  ${label}：已有 ${CUSTOM_CLUB_NAME_FIELD_ID}`);
      continue;
    }

    // 社團名稱欄位：優先取既有 club_picker，其次取文字型的社團名稱欄位並轉為 picker
    let pickerIndex = fields.findIndex((f) => f.type === "club_picker");
    let convertedFrom: string | null = null;

    if (pickerIndex === -1) {
      const textual = findClubNameField(fields);
      if (!textual) {
        console.log(`⏭  ${label}：沒有社團名稱欄位`);
        continue;
      }
      pickerIndex = fields.indexOf(textual);
      convertedFrom = textual.type;
      fields[pickerIndex] = {
        ...textual,
        type: "club_picker",
        placeholder: "請選擇您的社團；名單中沒有請選「— 無 —」",
      };
    }

    fields.splice(pickerIndex + 1, 0, buildCustomField(fields[pickerIndex].id));
    fields.forEach((f, i) => { f.order = i; });

    console.log(
      `✏️  ${label}：${convertedFrom ? `${convertedFrom} → club_picker，` : ""}` +
        `插入 ${CUSTOM_CLUB_NAME_FIELD_ID}（欄位 ${data.fields?.length ?? 0} → ${fields.length}）`,
    );

    if (APPLY) await formDoc.ref.update({ fields });
    changed += 1;
  }

  console.log(
    `\n${APPLY ? "✅ 已寫入" : "🔍 預覽（未寫入，加上 --apply 才會實際更新）"}：${changed} 份表單。`,
  );
  if (APPLY && changed > 0) {
    console.log("⚠️  表單公開頁為 ISR 快取，請到後台開啟這些表單並儲存一次以觸發 revalidate。");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
