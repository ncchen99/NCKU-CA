/**
 * Facebook 貼文匯入腳本（News + 活動回顧）
 *
 * 使用方式:
 *   cd web && npm run seed:facebook-posts
 *
 * 可選環境變數:
 *   SEED_POST_STATUS=draft|published   (預設: draft)
 *   SEED_AUTHOR_UID=<uid>              (預設: system-seed)
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
const { getFirestore, FieldValue, Timestamp } = firebaseFirestore;

type PostCategory = "news" | "activity_review";
type PostStatus = "draft" | "published";

interface SeedPost {
    title: string;
    slug: string;
    category: PostCategory;
    tags: string[];
    content_markdown: string;
    published_at: string;
    cover_image_url?: string;
}

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

function getSeedStatus(): PostStatus {
    const raw = String(process.env.SEED_POST_STATUS ?? "draft").trim().toLowerCase();
    return raw === "published" ? "published" : "draft";
}

const SEED_POSTS: SeedPost[] = [
    {
        title: "114學年度下學期期初社團代表大會｜會議資訊與請假提醒",
        slug: "114-2-club-representative-meeting-announcement",
        category: "news",
        tags: ["社代大會", "會議通知", "社團代表"],
        published_at: "2026-03-10T19:00:00+08:00",
        content_markdown: `# 114學年度下學期期初社團代表大會｜會議資訊與請假提醒

新學期開始，敬請各社團指派代表出席本次社團代表大會。本次會議將針對章程與辦法進行更動、調整與討論，內容攸關社團權益，請各社團務必重視。

## 會議資訊

- **參加對象**：各社團代表
- **日期**：2026/03/10（星期二）
- **時間**：18:30 開放簽到，19:00 會議開始，預計 20:30 散會
- **地點**：成功校區 資訊暨理化實驗大樓 格致廳（小講堂）
- **出席調查**：https://reurl.cc/nlqbEl

> 可推舉任一社員擔任並代表社團與會；與會代表需對會議結果負責。

## 請假規範

- 本次請假採表單填寫形式
- **請假期限**：2026/03/09 23:59 前
- 填寫請假表單後，無須另行通知性質主席或社聯會粉專
- 若臨時有緊急事宜未克出席，請私訊社聯會粉專
- 社團連續兩次無故缺席社代大會，將提出退場

## 保證金領取

- **開放時間**：會後開放領取社博、暑假場協保證金
- **應備文件**：保證金收據（建議自備零鈔）
- 收據遺失者可於現場簽具切結書後辦理退還

---

社代大會事關社團權益，請各社團盡量派員出席。`,
    },
    {
        title: "114學年度下學期社團博覽會暨動態舞台｜報名開放中",
        slug: "114-2-club-festival-and-stage-registration",
        category: "news",
        tags: ["社團博覽會", "動態舞台", "報名資訊"],
        published_at: "2026-02-01T12:00:00+08:00",
        content_markdown: `# 114學年度下學期社團博覽會暨動態舞台｜報名開放中

本學期社團博覽會攤位與動態舞台報名正式開始，歡迎各社團踴躍參與！如有最新消息，將即時公布於粉專及社聯平台。

## 活動資訊

- **活動日期**：2026/03/03（二）至 2026/03/04（三）
- **活動地點**：光復校區學生活動中心周邊
- **報名期間**：即日起至 2026/02/09（一）23:59 截止
- **報名連結**：https://reurl.cc/0aqM9Y

## 費用與保證金

- **報名費用**：500 元
- 已繳社聯會費 100 元者免另繳報名費（限校內社團）
- **保證金**：1,500 元（所有擺攤社團皆須繳交）

## 規範提醒

- 社博期間禁止私自使用明火
- 如有明火需求，需事先通報並完成相關申請
- 保證金規則請參考公告文件

## 補充說明

- 報名結果將於截止後公布於粉專及社團聯合平台
- 報名費與保證金收取時間將另行公告
- 如有問題，歡迎私訊粉專

---

請有意參與的社團把握報名時程，逾期恕不受理。`,
    },
    {
        title: "114學年度寒假場地協調會｜申請方式與保證金規定",
        slug: "114-winter-venue-coordination-announcement",
        category: "news",
        tags: ["場地協調", "寒假場協", "保證金"],
        published_at: "2025-11-10T12:00:00+08:00",
        content_markdown: `# 114學年度寒假場地協調會｜申請方式與保證金規定

為利寒假期間社團場地使用安排，請有需求之單位依公告流程完成申請並派員出席場地協調會。

## 申請流程

1. 填寫寒假場地表單
2. 務必派員出席寒假場地協調會

## 協調會資訊

- **日期**：2025/11/18
- **時間**：19:00 - 21:00
- **地點**：暫訂學生活動中心二樓樓梯前走廊

## 重要規範

- 申請場地之單位皆須派員到場
- 即使時段無衝突，仍須現場最終確認並完成保證金繳納
- 協調當下未到場視同放棄，並默認現場協調結果
- 一切以場協會當日決議為準

## 保證金規則

- 5 日（含）內：1,000 元
- 每增加 1 日：加收 200 元
- 保證金需於當日繳納，未繳納者場地不予保留

---

請相關社團與系學會務必派員到場，以保障場地使用權益。`,
    },
    {
        title: "十一月學生活動中心、芸青軒工讀生值班表｜會議室使用提醒",
        slug: "nov-duty-schedule-and-room-guidelines",
        category: "news",
        tags: ["工讀生值班", "會議室", "場地管理"],
        published_at: "2025-11-01T09:00:00+08:00",
        content_markdown: `# 十一月學生活動中心、芸青軒工讀生值班表｜會議室使用提醒

為維護公共空間品質，請各使用單位於會議室/討論室使用完畢後，依規定完成清點與檢核程序。

## 會議室與討論室使用注意事項

- 使用結束後請工讀生清點
- 填寫公共空間管理檢核表
- 二活非值班時段，請改聯繫一活工讀生
- 離場前請關閉電燈、電扇、冷氣並恢復門禁系統
- 請勿將桌椅搬離會議室/討論室

## 工讀生值班業務範圍

1. 學生活動中心第一至第五會議室及地下室多功能室清點
2. 芸青軒第一至第三會議室及第一至第六討論室清點

---

請各單位共同配合空間管理規範，維持場地使用品質。`,
    },
    {
        title: "114學年度上學期期末社團代表大會｜活動回顧",
        slug: "114-1-club-representative-meeting-recap",
        category: "activity_review",
        tags: ["社代大會", "活動回顧", "期末會議"],
        published_at: "2025-12-17T12:00:00+08:00",
        content_markdown: `# 114學年度上學期期末社團代表大會｜活動回顧

感謝各社團代表於學期末撥冗參與期末社團代表大會，協助本會完成重要議題的討論與確認。

## 活動資訊

- **日期**：2025/12/16（星期二）
- **時間**：18:30 簽到，19:00 會議開始
- **地點**：成功校區 資訊暨理化實驗大樓 格致廳（小講堂）

## 本次會議重點

- 社團相關辦法之更動與調整
- 議題討論與代表意見彙整
- 後續執行方向與行政流程說明

---

社代大會關乎社團共同權益，謝謝各社團持續參與公共事務。`,
    },
    {
        title: "114學年度寒假場地協調會｜活動回顧與執行提醒",
        slug: "114-winter-venue-coordination-recap",
        category: "activity_review",
        tags: ["寒假場協", "活動回顧", "場地協調"],
        published_at: "2025-11-19T12:00:00+08:00",
        content_markdown: `# 114學年度寒假場地協調會｜活動回顧與執行提醒

本次寒假場地協調會已依公告時程完成現場協調作業，感謝各申請單位配合出席與確認。

## 協調會目的

- 確認寒假期間各單位場地使用時段
- 處理同時段場地申請衝突
- 完成保證金與後續管理規範說明

## 會中重點

- 申請單位需現場確認，未到場者視同放棄
- 場協結果以當日決議為準
- 保證金依使用天數計收，且需依規定時點完成繳納

---

若後續有場地使用異動，請依社聯會公告時程辦理補件或調整。`,
    },
];

async function upsertPosts(db: FirebaseFirestore.Firestore) {
    const status = getSeedStatus();
    const authorUid = String(process.env.SEED_AUTHOR_UID ?? "system-seed").trim() || "system-seed";

    console.log("\n📰 開始匯入 Facebook 轉換文章...");
    console.log(`  - 目標狀態: ${status}`);
    console.log(`  - 作者 UID: ${authorUid}`);

    let created = 0;
    let updated = 0;

    for (const post of SEED_POSTS) {
        const existing = await db
            .collection("posts")
            .where("slug", "==", post.slug)
            .limit(1)
            .get();

        const payload = {
            title: post.title,
            slug: post.slug,
            category: post.category,
            cover_image_url: post.cover_image_url ?? "",
            content_markdown: post.content_markdown,
            tags: post.tags,
            status,
            published_at: status === "published"
                ? Timestamp.fromDate(new Date(post.published_at))
                : null,
            updated_at: FieldValue.serverTimestamp(),
            author_uid: authorUid,
        };

        if (existing.empty) {
            await db.collection("posts").add(payload);
            created++;
            console.log(`  ✅ 新增: ${post.slug}`);
            continue;
        }

        const ref = existing.docs[0].ref;
        await ref.set(payload, { merge: true });
        updated++;
        console.log(`  ♻️ 更新: ${post.slug}`);
    }

    console.log(`\n🧾 匯入完成：新增 ${created} 筆，更新 ${updated} 筆`);
}

async function main() {
    console.log("🚀 Facebook 貼文匯入腳本啟動");
    console.log("=".repeat(50));

    const envPath = resolve(PROJECT_ROOT, "web", ".env");
    loadEnv(envPath);

    const db = initFirebase();
    console.log("🔥 Firebase Admin SDK 初始化成功");

    await upsertPosts(db);

    console.log("\n" + "=".repeat(50));
    console.log("✅ 全部完成");
}

main().catch((err) => {
    console.error("❌ 匯入失敗:", err);
    process.exit(1);
});
