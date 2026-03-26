# Wireframes — 頁面設計說明

> 本資料夾收錄 NCKU NCA 官方平台所有頁面的 Wireframe 及設計文字描述。  
> 視覺 Wireframe 使用 HTML 檔案呈現（可直接在瀏覽器開啟），  
> 文字描述供 Stitches 等 AI 設計工具生成設計稿使用。  
> 設計規範請參閱 `../DESIGN.md` 及 `../../specs/AGENTS.md`。

---

## 檔案索引

| 檔案                      | 頁面       | 說明                                             |
| ------------------------- | ---------- | ------------------------------------------------ |
| `homepage-wireframe.html` | `/` 首頁   | 視覺 Wireframe（瀏覽器可直接開啟）               |
| `README.md`（本文件）     | —          | 所有頁面的文字佈局說明                           |
| `admin-pages.md`          | `/admin/*` | 後台管理頁面設計描述（社博報名、點名、社團名單） |

---

## 設計語彙速查（Stitches Prompt 使用）

```
主色: #510110（酒紅色）· 背景: #FFFFFF · 邊界: #E5E7EB
字體主體: Inter Variable（font-feature ss01 開啟）
字體等寬: Geist Mono（Eyebrow、標籤、Meta 資訊）
按鈕: h-36~38px · rounded-full · font-weight 550
卡片邊框: outer ring (gray-950, opacity 8-10%)，非 solid border
設計風格: 扁平化、低陰影、圓角適中（rounded-md / rounded-lg）
```

---

## 首頁 `/` — 頁面佈局文字描述

> 對應視覺稿：`homepage-wireframe.html`

### 整體結構（由上至下）

```
Navbar
├── [匿名態] Logo + 主選單 + 「以 Google 登入」按鈕
└── [登入態] Logo + 主選單 + 快速入口（今日點名 · 表單報名） + User Avatar

[條件] 點名橫幅（primary #510110 背景，登入 + 有進行中點名事件時顯示）

Hero Section（Split 3/5 左 : 2/5 右）

Canvas Grid 裝飾線

組織簡介 Section（左：使命文字；右：四大職能 Cards）

Canvas Grid 裝飾線

最新消息預覽 Section（3 欄等寬 Cards）

Canvas Grid 裝飾線

活動回顧預覽 Section（不對稱：1 大 Featured + 2 小 Side-by-side）

Canvas Grid 裝飾線

Footer（3 欄：品牌 2/4 + 快速導覽 1/4 + 聯絡資訊 1/4）
```

---

### ① Navbar

**匿名態**

- 左側：Logo Mark（28×28, rounded-md, primary #510110）+ 組織名稱文字（13px, font-weight 650, tracking-tight）
- 中央：主選單連結（關於我們 / 組織章程 / 幹部成員 / 最新消息 / 活動回顧）；13px, font-weight 450, neutral-600
- 右側：「以 Google 登入」Ghost Button（h-36px, rounded-full, border neutral-200）

**登入態**（差異處）

- 右側快速入口區（取代登入按鈕）：
  - 「✓ 今日點名」Pill Button（h-32px, rounded-full）
    - 有進行中事件 → primary #510110 背景 + 白色文字（active 態）
    - 無進行中事件 → ghost 樣式（border）
  - 「📋 表單報名」Pill Button（ghost，點擊展開下拉清單，列出 status=open 的表單）
  - 垂直分隔線（1px, neutral-200, h-20px）
  - User Avatar Circle（32×32px，顯示姓名首字，circle border）

**設計規則**：按鈕高度 36-38px（Pill 略縮為 32px）· rounded-full · text-sm

---

### ② 點名橫幅（條件顯示）

- 條件：用戶已登入 **且** 有 `status = 'open'` 的 `attendance_event`
- 背景：primary #510110（全寬）
- 左側：Live Dot（8×8px 紅色，CSS pulse 動畫）+ 事件名稱 + 截止時間（白色文字，13px）
- 右側：「立即前往點名 →」小型 Outline Button（半透明白色邊框，h-28px，rounded-full）
- 與 Navbar 的「今日點名」Pill 呈視覺呼應（同時高亮）

---

### ③ Hero Section

**版型**：Split Headline（左 3/5 · 右 2/5）· 底部對齊 · 左對齊（非置中）

**左側（3/5 寬）**

- Eyebrow：Geist Mono · 全大寫 · letter-spacing 0.12em · font-size 10px · neutral-600
  - 格式：`─── NCKU STUDENT FEDERATION — EST. 1993`
- H1 標題：「成功大學」（黑色）+ 換行 +「社團聯合會」（primary #510110）
  - font-size 50px · font-weight 700 · letter-spacing -0.03em（tracking-tight）· line-height 1.06
- 副標題：「官方數位平台」；font-size 30px · font-weight 350 · neutral-600
- CTA 按鈕組（左對齊）：
  - 「認識組織」Primary Button（h-38px，用 `span + padding:1px` 包裹補 2px 對齊）
  - 「最新消息」Ghost Button（h-36px）

**右側（2/5 寬）**

- 描述文字：max-w-[40ch] · line-height 28px（雙倍行高）· neutral-600 · text-pretty
- 統計列表（3 列，每列底部細線分隔）：
  - `420+` — 學生社團（A–H 類）
  - `2 學期` — 定期代表大會 + 社博
  - `@gs.ncku.edu.tw` — 僅限成大校內帳號

---

### ④ 組織簡介（重排後）

**版型**：2 欄等寬 · neutral-50 背景

- Section Heading（Inline）：「關於組織」深色粗體（22px, font-weight 700）+ 「About NCKU NCA」灰色中等字重（14px, neutral-600）同行

**左欄：使命說明**

- 兩段描述文字（max-w-[52ch]，line-height 28px，neutral-600，text-pretty）：
  - 第一段：組織性質與職責
  - 第二段：本平台的數位化目標
- CTA 按鈕組：「閱讀更多」Primary + 「組織章程」Ghost（h-36px）

**右欄：四大職能 Highlight Cards**

- Eyebrow：「我們負責的四大領域」（Geist Mono, uppercase, 10px, neutral-600）
- 2×2 Cards Grid（gap 12px），每張卡片包含：
  - Icon（28×28px，rounded-md，primary accent bg）
  - 標題（13px, font-weight 600）
  - 描述（12px, neutral-600, line-height 1.55）
  - 四卡內容：🏛 組織治理 · 🎪 社博管理 · 📋 表單系統 · ✅ 數位點名
- Card 樣式：white bg · outer ring（gray-950, opacity 8%）· rounded-lg
- 內層 icon rounded-md（Concentric Radius：outer radius − padding）

---

### ⑤ 最新消息預覽

**版型**：3 欄等寬 Grid · white 背景

- Section Header 行（flex，space-between）：
  - 左：Inline Heading「最新消息」+「Latest News」
  - 右：「查看全部 →」文字連結（primary 色）
- 3 張 News Cards（各欄等寬）：
  - 封面圖佔位（16:9 比例，wf-img 灰）
  - 分類標籤（絕對定位左上角，primary bg，rounded-full，10px Geist Mono）
  - 日期（11px, Geist Mono, neutral-400）
  - 標題（14px, font-weight 600, tracking-tight）
  - 摘要（12px，2 行截斷，neutral-600）
- Card 樣式：outer ring (gray-950, 8%)，rounded-lg，無 shadow

---

### ⑥ 活動回顧預覽（不對稱版型）

**版型**：2 欄 Grid · neutral-50 背景

- Section Header 行（同最新消息格式）
- 左欄（Featured Card，`grid-row: span 2`）：
  - 大封面圖（260px 高）
  - 文章標籤（inline，ghost 樣式，rounded-full，10px Geist Mono）
  - 標題（14px, font-weight 600）
  - 摘要（完整 2-3 行，13px，neutral-600）
  - 「閱讀全文 →」文字連結（primary 色）
- 右欄（Small Cards × 2，上下疊排）：
  - 橫向佈局：縮圖（120px 固定寬）+ 文字區
  - 文字區：標籤 + 標題（13px）+ 摘要（1-2 行截斷）
- Card 樣式：outer ring，rounded-lg，無 shadow

---

### ⑦ Footer

**版型**：3 欄 Grid（2/4 + 1/4 + 1/4）· white 背景

- 品牌欄（2/4）：
  - Logo Mark + 組織名稱（同 Navbar）
  - 組織說明文字（13px, line-height 24px，max-w-[40ch]，neutral-600）
  - 社群 Icons 列：FB · IG · YT（30×30px，rounded-md，ghost border）
- 快速導覽欄（1/4）：
  - 欄標題（12px, font-weight 600, neutral-950）
  - 連結列表：關於我們 / 組織章程 / 幹部成員 / 最新消息 / 活動回顧
- 聯絡資訊欄（1/4）：
  - Email：📧 nca.ncku@gmail.com
  - 地點：📍 台南市東區大學路1號學生活動中心2樓社團聯合會辦公室
  - 「登入系統 →」primary 色文字連結
- Footer Bar（border-top）：
  - 左：版權聲明（Geist Mono, 11px, neutral-400）
  - 右：技術堆疊說明（同字型）

---

### Canvas Grid 裝飾線（Section 之間）

- 每個主要 Section 之間插入裝飾線區塊（高度 28px）
- 水平中線：1px solid · border 色 · 全寬
- 垂直重複線：48px 間距的 repeating-linear-gradient（border 色）
- 效果：格紙質感，提供視覺節奏分隔

---

## 其他頁面（待補充）

| 路徑               | 狀態                | 說明                                     |
| ------------------ | ------------------- | ---------------------------------------- |
| `/about`           | 待設計              | Markdown 渲染頁，含 Eyebrow + 長文本排版 |
| `/charter`         | 待設計              | 章程頁，含錨點導航側邊欄                 |
| `/members`         | 待設計              | 成員架構可視化                           |
| `/news`            | 待設計              | 消息列表（分頁）                         |
| `/news/[slug]`     | 待設計              | 單篇文章（OG 標籤）                      |
| `/activities`      | 待設計              | 活動列表                                 |
| `/forms/[form_id]` | 待設計              | 公開表單填寫頁                           |
| `/admin/*`         | 見 `admin-pages.md` | 後台管理系統                             |
