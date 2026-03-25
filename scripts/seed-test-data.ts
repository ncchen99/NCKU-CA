/**
 * 測試資料種子腳本
 *
 * 1. 將 f74104765@gs.ncku.edu.tw 設為 admin
 * 2. 建立測試文章 (posts)
 * 3. 建立測試表單 + 回覆 (forms + responses)
 * 4. 建立測試點名事件 + 紀錄 (attendance_events + records)
 * 5. 建立測試保證金紀錄 (deposit_records)
 *
 * 使用方式:
 *   cd web && npx tsx ../scripts/seed-test-data.ts
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
const { getFirestore, FieldValue, Timestamp } = firebaseFirestore;

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

// ---------------------------------------------------------------------------
// 1. 設定 Admin 帳號
// ---------------------------------------------------------------------------
const ADMIN_EMAIL = "f74104765@gs.ncku.edu.tw";

async function setupAdmin(
  auth: ReturnType<typeof getAuth>,
  db: FirebaseFirestore.Firestore
) {
  console.log("\n👑 設定 Admin 帳號...");

  let uid: string;
  try {
    const userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
    uid = userRecord.uid;
    console.log(`  ✅ 找到用戶: ${uid}`);
  } catch {
    console.log(`  ⚠️  用戶 ${ADMIN_EMAIL} 尚未登入過，先建立 Custom Claims 備用記錄`);
    console.log(`  💡 請先用此帳號登入一次，再重新執行此腳本`);
    return null;
  }

  await auth.setCustomUserClaims(uid, { role: "admin" });
  console.log(`  ✅ Custom Claims 設定完成: role=admin`);

  await db.collection("users").doc(uid).set(
    {
      uid,
      display_name: "系統管理員",
      email: ADMIN_EMAIL,
      role: "admin",
      created_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`  ✅ Firestore users/${uid} 文件已建立/更新`);

  return uid;
}

// ---------------------------------------------------------------------------
// 2. 建立測試文章
// ---------------------------------------------------------------------------
async function seedPosts(db: FirebaseFirestore.Firestore, adminUid: string) {
  console.log("\n📰 建立測試文章...");
  const batch = db.batch();

  const posts = [
    {
      title: "113學年度第二學期社團博覽會即將登場",
      slug: "113-2-club-expo-announcement",
      category: "news",
      cover_image_url: "",
      content_markdown: `# 113學年度第二學期社團博覽會即將登場

親愛的社團夥伴們：

113學年度第二學期社團博覽會將於 **4月15日至4月17日** 在成功校區中正堂前廣場盛大舉行！

## 活動資訊

- **日期**：2026年4月15日（三）至4月17日（五）
- **時間**：11:00–17:00
- **地點**：成功校區中正堂前廣場

## 報名方式

請各社團於 **4月1日** 前至本平台填寫報名表單，並完成保證金繳交。

## 注意事項

1. 每社團限報名一個攤位
2. 保證金 $3,000 元，活動結束後退還
3. 需自備帳篷及桌椅

如有任何問題，歡迎聯繫社聯會活動組。

社團聯合會 敬上`,
      tags: ["社博", "報名", "113學年"],
      status: "published",
      published_at: Timestamp.fromDate(new Date("2026-03-20T10:00:00+08:00")),
      updated_at: FieldValue.serverTimestamp(),
      author_uid: adminUid,
    },
    {
      title: "113-1 寒假聯合會活動圓滿落幕",
      slug: "113-1-winter-association-review",
      category: "activity_review",
      cover_image_url: "",
      content_markdown: `# 113-1 寒假聯合會活動圓滿落幕

## 活動回顧

本學期寒假聯合會於 2026年1月20日至1月22日在台南市立文化中心順利舉辦，共有 **42個社團** 參與，吸引超過 **3,000位** 民眾到場參觀。

## 活動亮點

### 開幕式
由校長親自蒞臨致詞，並由社聯會會長帶領各社團代表進行開幕儀式。

### 社團表演
- 熱舞社帶來精彩的街舞表演
- 吉他社演奏經典曲目
- 話劇社呈現原創短劇

### 體驗活動
各社團設置體驗攤位，讓民眾能夠親身體驗社團活動的樂趣。

## 感謝

感謝所有參與社團的辛勤付出，以及志工團隊的協助，讓活動圓滿成功！

期待下次活動再見！`,
      tags: ["寒聯會", "活動回顧", "113學年"],
      status: "published",
      published_at: Timestamp.fromDate(new Date("2026-02-15T14:00:00+08:00")),
      updated_at: FieldValue.serverTimestamp(),
      author_uid: adminUid,
    },
    {
      title: "社團幹部交接須知（草稿）",
      slug: "club-leader-handover-guide",
      category: "news",
      cover_image_url: "",
      content_markdown: `# 社團幹部交接須知

## 交接時程

各社團請於學期結束前完成幹部交接作業。

## 交接清單

- [ ] 社團印章
- [ ] 財務紀錄
- [ ] 社團資產清冊
- [ ] 活動檔案

（草稿待完善）`,
      tags: ["幹部交接", "公告"],
      status: "draft",
      published_at: null,
      updated_at: FieldValue.serverTimestamp(),
      author_uid: adminUid,
    },
  ];

  for (const post of posts) {
    const ref = db.collection("posts").doc();
    batch.set(ref, post);
    console.log(`  ✅ ${post.title} (${post.status})`);
  }

  await batch.commit();
  console.log(`📰 文章建立完成（共 ${posts.length} 篇）`);
}

// ---------------------------------------------------------------------------
// 3. 建立測試表單 + 回覆
// ---------------------------------------------------------------------------
async function seedForms(db: FirebaseFirestore.Firestore, adminUid: string) {
  console.log("\n📋 建立測試表單...");

  // 取一些真實社團 ID
  const clubsSnapshot = await db.collection("clubs").limit(10).get();
  const clubIds = clubsSnapshot.docs.map((d) => d.id);
  const clubNames = clubsSnapshot.docs.map((d) => d.data().name as string);

  // --- 表單 1: 社博報名 ---
  const expoFormRef = db.collection("forms").doc();
  const expoFormData = {
    title: "113-2 社團博覽會報名",
    description:
      "113學年度第二學期社團博覽會報名表單。請各社團於截止日期前完成填寫並繳交保證金。",
    form_type: "expo_registration",
    status: "open",
    settings: {
      one_response_per_club: true,
      prefill_from_user: true,
    },
    deposit_policy: {
      required: true,
      amount: 3000,
      binding_mode: "linked_to_response",
      refund_rule: "活動結束後一週內，確認場地無損壞即退還全額保證金。",
    },
    fields: [
      {
        id: "club_name",
        type: "club_picker",
        label: "社團名稱",
        required: true,
        default_from_user: "club_name",
        order: 1,
      },
      {
        id: "contact_person",
        type: "text",
        label: "聯絡人姓名",
        placeholder: "請輸入聯絡人姓名",
        required: true,
        default_from_user: "display_name",
        order: 2,
      },
      {
        id: "contact_phone",
        type: "phone",
        label: "聯絡電話",
        placeholder: "0912-345-678",
        required: true,
        order: 3,
      },
      {
        id: "contact_email",
        type: "email",
        label: "聯絡信箱",
        required: true,
        default_from_user: "email",
        order: 4,
      },
      {
        id: "activity_name",
        type: "text",
        label: "攤位活動名稱",
        placeholder: "例：吉他教學體驗",
        required: true,
        order: 5,
      },
      {
        id: "needs_electricity",
        type: "radio",
        label: "是否需要電源",
        required: true,
        options: ["是", "否"],
        order: 6,
      },
      {
        id: "electricity_details",
        type: "textarea",
        label: "用電設備說明",
        placeholder: "請說明需要用電的設備及功率",
        required: false,
        depends_on: {
          field_id: "needs_electricity",
          operator: "equals",
          value: "是",
          action: "show",
        },
        order: 7,
      },
      {
        id: "remarks",
        type: "textarea",
        label: "備註",
        placeholder: "其他需要補充的事項",
        required: false,
        order: 8,
      },
    ],
    created_by: adminUid,
    created_at: FieldValue.serverTimestamp(),
    closes_at: Timestamp.fromDate(new Date("2026-04-01T23:59:59+08:00")),
    revalidate_path: `/forms/${expoFormRef.id}`,
  };

  await expoFormRef.set(expoFormData);
  console.log(`  ✅ 表單: ${expoFormData.title} (ID: ${expoFormRef.id})`);

  // 建立一些回覆 + 對應的保證金紀錄
  for (let i = 0; i < Math.min(5, clubIds.length); i++) {
    const responseRef = expoFormRef.collection("responses").doc();
    await responseRef.set({
      form_id: expoFormRef.id,
      club_id: clubIds[i],
      submitted_by_uid: adminUid,
      answers: {
        club_name: clubNames[i],
        contact_person: `聯絡人${i + 1}`,
        contact_phone: `091${String(i).padStart(7, "0")}${i + 1}`,
        contact_email: `contact${i + 1}@gs.ncku.edu.tw`,
        activity_name: `社團體驗活動${i + 1}`,
        needs_electricity: i % 2 === 0 ? "是" : "否",
        ...(i % 2 === 0 ? { electricity_details: "音響設備 500W" } : {}),
        remarks: i === 0 ? "需要靠近出口的位置" : "",
      },
      submitted_at: FieldValue.serverTimestamp(),
      is_duplicate_attempt: false,
    });

    const depositRef = db.collection("deposit_records").doc();
    const depositStatuses = [
      "pending_payment",
      "pending_payment",
      "paid",
      "paid",
      "returned",
    ] as const;
    const depositData: Record<string, unknown> = {
      club_id: clubIds[i],
      form_id: expoFormRef.id,
      form_response_id: responseRef.id,
      status: depositStatuses[i],
      amount: 3000,
      updated_by: adminUid,
      notes: "",
    };
    if (depositStatuses[i] === "paid" || depositStatuses[i] === "returned") {
      depositData.paid_at = Timestamp.fromDate(
        new Date(`2026-03-${10 + i}T14:00:00+08:00`)
      );
    }
    if (depositStatuses[i] === "returned") {
      depositData.returned_at = Timestamp.fromDate(
        new Date("2026-03-22T10:00:00+08:00")
      );
    }
    await depositRef.set(depositData);

    console.log(
      `    📝 回覆 + 💰 保證金: ${clubNames[i]} (${depositStatuses[i]})`
    );
  }

  // --- 表單 2: 寒假場協報名 ---
  const winterFormRef = db.collection("forms").doc();
  const winterFormData = {
    title: "113-1 寒假場協報名",
    description:
      "寒假場地協調活動報名表單。請於截止前完成填寫並繳交保證金。",
    form_type: "winter_association_registration",
    status: "open",
    settings: {
      one_response_per_club: true,
      prefill_from_user: true,
    },
    deposit_policy: {
      required: true,
      amount: 2000,
      binding_mode: "linked_to_response",
      refund_rule: "活動結束後三個工作天內完成場地檢核，通過後退還保證金。",
    },
    fields: [
      {
        id: "club_name",
        type: "club_picker",
        label: "社團名稱",
        required: true,
        default_from_user: "club_name",
        order: 1,
      },
      {
        id: "contact_person",
        type: "text",
        label: "聯絡人姓名",
        placeholder: "請輸入聯絡人姓名",
        required: true,
        default_from_user: "display_name",
        order: 2,
      },
      {
        id: "contact_phone",
        type: "phone",
        label: "聯絡電話",
        placeholder: "0912-345-678",
        required: true,
        order: 3,
      },
      {
        id: "contact_email",
        type: "email",
        label: "聯絡信箱",
        required: true,
        default_from_user: "email",
        order: 4,
      },
      {
        id: "activity_name",
        type: "text",
        label: "活動名稱",
        placeholder: "例：寒訓成果發表",
        required: true,
        order: 5,
      },
      {
        id: "use_case",
        type: "textarea",
        label: "場地使用需求",
        placeholder: "請說明場地配置與需求",
        required: true,
        order: 6,
      },
      {
        id: "remarks",
        type: "textarea",
        label: "備註",
        placeholder: "其他需要補充的事項",
        required: false,
        order: 7,
      },
    ],
    created_by: adminUid,
    created_at: FieldValue.serverTimestamp(),
    closes_at: Timestamp.fromDate(new Date("2026-01-05T23:59:59+08:00")),
    revalidate_path: `/forms/${winterFormRef.id}`,
  };

  await winterFormRef.set(winterFormData);
  console.log(`  ✅ 表單: ${winterFormData.title} (ID: ${winterFormRef.id})`);

  for (let i = 0; i < Math.min(3, clubIds.length); i++) {
    const responseRef = winterFormRef.collection("responses").doc();
    await responseRef.set({
      form_id: winterFormRef.id,
      club_id: clubIds[i],
      submitted_by_uid: adminUid,
      answers: {
        club_name: clubNames[i],
        contact_person: `寒假聯絡人${i + 1}`,
        contact_phone: `092${String(i).padStart(7, "0")}${i + 1}`,
        contact_email: `winter${i + 1}@gs.ncku.edu.tw`,
        activity_name: `寒假活動${i + 1}`,
        use_case: "需要 1 間教室與投影設備",
        remarks: "",
      },
      submitted_at: FieldValue.serverTimestamp(),
      is_duplicate_attempt: false,
    });

    const depositRef = db.collection("deposit_records").doc();
    await depositRef.set({
      club_id: clubIds[i],
      form_id: winterFormRef.id,
      form_response_id: responseRef.id,
      status: i === 0 ? "returned" : "paid",
      amount: 2000,
      updated_by: adminUid,
      notes: "",
      paid_at: Timestamp.fromDate(new Date(`2025-12-${20 + i}T14:00:00+08:00`)),
      ...(i === 0
        ? { returned_at: Timestamp.fromDate(new Date("2026-01-25T11:30:00+08:00")) }
        : {}),
    });

    console.log(`    📝 回覆 + 💰 保證金(寒假場協): ${clubNames[i]}`);
  }

  // --- 表單 3: 期初社代會出席調查 ---
  const surveyFormRef = db.collection("forms").doc();
  const surveyFormData = {
    title: "113-2 期初社代會出席意願調查",
    description:
      "請各社團填寫出席意願，以利安排場地及座位。本問卷不需要繳交保證金。",
    form_type: "attendance_survey",
    status: "open",
    settings: {
      one_response_per_club: true,
      prefill_from_user: true,
    },
    deposit_policy: {
      required: false,
      binding_mode: "independent",
    },
    fields: [
      {
        id: "club_name",
        type: "club_picker",
        label: "社團名稱",
        required: true,
        default_from_user: "club_name",
        order: 1,
      },
      {
        id: "representative_name",
        type: "text",
        label: "代表人姓名",
        required: true,
        default_from_user: "display_name",
        order: 2,
      },
      {
        id: "representative_title",
        type: "text",
        label: "代表人職稱",
        placeholder: "例：社長、副社長",
        required: true,
        order: 3,
      },
      {
        id: "will_attend",
        type: "radio",
        label: "是否出席",
        required: true,
        options: ["出席", "不出席", "待確認"],
        order: 4,
      },
      {
        id: "absence_reason",
        type: "textarea",
        label: "無法出席原因",
        required: false,
        depends_on: {
          field_id: "will_attend",
          operator: "equals",
          value: "不出席",
          action: "show",
        },
        order: 5,
      },
      {
        id: "remarks",
        type: "textarea",
        label: "備註",
        required: false,
        order: 6,
      },
    ],
    created_by: adminUid,
    created_at: FieldValue.serverTimestamp(),
    closes_at: Timestamp.fromDate(new Date("2026-04-10T23:59:59+08:00")),
    revalidate_path: `/forms/${surveyFormRef.id}`,
  };

  await surveyFormRef.set(surveyFormData);
  console.log(`  ✅ 表單: ${surveyFormData.title} (ID: ${surveyFormRef.id})`);

  // 一些回覆
  for (let i = 5; i < Math.min(8, clubIds.length); i++) {
    const responseRef = surveyFormRef.collection("responses").doc();
    const willAttend = ["出席", "出席", "不出席"][i - 5];
    await responseRef.set({
      form_id: surveyFormRef.id,
      club_id: clubIds[i],
      submitted_by_uid: adminUid,
      answers: {
        club_name: clubNames[i],
        representative_name: `代表${i + 1}`,
        representative_title: "社長",
        will_attend: willAttend,
        ...(willAttend === "不出席"
          ? { absence_reason: "社長出國無法出席" }
          : {}),
        remarks: "",
      },
      submitted_at: FieldValue.serverTimestamp(),
      is_duplicate_attempt: false,
    });
    console.log(`    📝 回覆: ${clubNames[i]} (${willAttend})`);
  }

  console.log("📋 表單建立完成");
}

// ---------------------------------------------------------------------------
// 4. 建立測試點名事件
// ---------------------------------------------------------------------------
async function seedAttendance(
  db: FirebaseFirestore.Firestore,
  adminUid: string
) {
  console.log("\n✅ 建立測試點名事件...");

  const clubsSnapshot = await db.collection("clubs").limit(30).get();
  const clubIds = clubsSnapshot.docs.map((d) => d.id);

  // 事件 1: 已結束的代表大會
  const event1Ref = db.collection("attendance_events").doc();
  await event1Ref.set({
    title: "113-2 第一次社長代表大會",
    description: "本學期第一次社長代表大會，請各社團派代表出席。",
    status: "closed",
    expected_clubs: clubIds.slice(0, 20),
    opens_at: Timestamp.fromDate(new Date("2026-03-10T18:00:00+08:00")),
    closes_at: Timestamp.fromDate(new Date("2026-03-10T20:00:00+08:00")),
    created_by: adminUid,
  });

  // 為已結束事件建立一些簽到紀錄
  const batch1 = db.batch();
  for (let i = 0; i < 15; i++) {
    const recordRef = event1Ref.collection("records").doc();
    batch1.set(recordRef, {
      club_id: clubIds[i],
      user_uid: adminUid,
      checked_in_at: Timestamp.fromDate(
        new Date(`2026-03-10T18:${String(5 + i).padStart(2, "0")}:00+08:00`)
      ),
      device_info: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
      is_duplicate_attempt: false,
    });
  }
  await batch1.commit();
  console.log(
    `  ✅ ${event1Ref.id}: 113-2 第一次社長代表大會 (closed, 15/20 出席)`
  );

  // 事件 2: 進行中的代表大會
  const event2Ref = db.collection("attendance_events").doc();
  await event2Ref.set({
    title: "113-2 第二次社長代表大會",
    description: "本學期第二次社長代表大會。",
    status: "open",
    expected_clubs: clubIds.slice(0, 25),
    opens_at: Timestamp.fromDate(new Date("2026-03-24T18:00:00+08:00")),
    closes_at: Timestamp.fromDate(new Date("2026-03-24T20:00:00+08:00")),
    created_by: adminUid,
  });

  const batch2 = db.batch();
  for (let i = 0; i < 10; i++) {
    const recordRef = event2Ref.collection("records").doc();
    batch2.set(recordRef, {
      club_id: clubIds[i],
      user_uid: adminUid,
      checked_in_at: Timestamp.fromDate(
        new Date(`2026-03-24T18:${String(2 + i).padStart(2, "0")}:00+08:00`)
      ),
      device_info: "Mozilla/5.0 (Android 14; Mobile)",
      is_duplicate_attempt: false,
    });
  }
  await batch2.commit();
  console.log(
    `  ✅ ${event2Ref.id}: 113-2 第二次社長代表大會 (open, 10/25 出席)`
  );

  // 事件 3: 即將開始
  const event3Ref = db.collection("attendance_events").doc();
  await event3Ref.set({
    title: "社團博覽會場地說明會",
    description: "社博場地分配說明會，請已報名社博的社團務必出席。",
    status: "upcoming",
    expected_clubs: clubIds.slice(0, 15),
    opens_at: Timestamp.fromDate(new Date("2026-04-14T14:00:00+08:00")),
    closes_at: Timestamp.fromDate(new Date("2026-04-14T16:00:00+08:00")),
    created_by: adminUid,
  });
  console.log(`  ✅ ${event3Ref.id}: 社團博覽會場地說明會 (upcoming)`);

  console.log("✅ 點名事件建立完成");
}

// ---------------------------------------------------------------------------
// 主程式
// ---------------------------------------------------------------------------
async function main() {
  console.log("🚀 NCKU NCA 測試資料種子腳本啟動");
  console.log("=".repeat(50));

  const envPath = resolve(PROJECT_ROOT, "web", ".env");
  console.log(`📂 載入環境變數: ${envPath}`);
  loadEnv(envPath);

  const { db, auth } = initFirebase();
  console.log("🔥 Firebase Admin SDK 初始化成功");

  const adminUid = await setupAdmin(auth, db);
  if (!adminUid) {
    console.log("\n⚠️  無法設定 Admin，但仍繼續建立測試資料（使用假 UID）");
  }

  const uid = adminUid ?? "system-seed";

  await seedPosts(db, uid);
  await seedForms(db, uid);
  await seedAttendance(db, uid);

  console.log("\n" + "=".repeat(50));
  console.log("✅ 所有測試資料建立完成！");
  console.log("\n📌 Admin 帳號: " + ADMIN_EMAIL);
  if (adminUid) {
    console.log("📌 Admin UID: " + adminUid);
    console.log("📌 請重新登入以取得最新的 Custom Claims");
  }
}

main().catch((err) => {
  console.error("❌ 種子腳本執行失敗:", err);
  process.exit(1);
});
