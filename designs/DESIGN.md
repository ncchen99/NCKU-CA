# 設計系統規格 (DESIGN.md)

> 詳細頁面佈局見 `wireframes/README.md`，後台頁面見 `wireframes/admin-pages.md`。  
> 設計行為準則見 `../specs/AGENTS.md`。

---

## 色彩系統 (Colors)

| Token | 值 | 用途 |
|---|---|---|
| `primary` | `#510110` | 主色（酒紅），CTA Button、標籤、Active 狀態、點名橫幅 |
| `primary-light` | `#7a0118` | Hover 狀態 |
| `primary-dark` | `#3a000b` | Active Press 狀態 |
| `background` | `#FFFFFF` | 頁面底色 |
| `border` | `#E5E7EB` | 邊框、分隔線 |
| `neutral-950` | `#0a0a0a` | 主要文字、深色標題 |
| `neutral-700` | `#404040` | Ghost Button 文字 |
| `neutral-600` | `#525252` | 次要文字、描述文字、Section 副標 |
| `neutral-400` | `#a3a3a3` | Meta 資訊（日期、ID）|
| `neutral-100` | `#f5f5f5` | 淡色背景 Section（如組織簡介）|
| `neutral-50` | `#fafafa` | 更淡背景 Section（如活動回顧）|
| Ring Outer | `gray-950 / 8~10%` | 卡片、按鈕外框（取代 solid border）|
| Ring Inset | `gray-950 / 5%` | 淡色背景容器的內邊框 |
| Container BG | `gray-950 / 2.5~5%` | Well-styled Container 底色 |

---

## 字體 (Typography)

| 用途 | 字體 | 字重 | 大小 | 特殊設定 |
|---|---|---|---|---|
| 主要文字 | Inter Variable | 400–650 | 依情境 | `font-feature-settings: 'ss01' 1`（關閉帶尾 L）|
| Eyebrow 標籤 | Geist Mono | 400–500 | 10px | `uppercase` + `letter-spacing: 0.10~0.12em` + `neutral-600` |
| 大標題（h1） | Inter Variable | 700 | 48–50px | `letter-spacing: -0.03em`（tracking-tight）|
| Section 標題 | Inter Variable | 700 | 22px | `letter-spacing: -0.03em` |
| 描述文字 | Inter Variable | 400–450 | 13–14px | `line-height: 28px`（雙倍行高呼吸感）|
| Meta / 日期 | Geist Mono | 400 | 11–12px | `neutral-400` |

---

## 按鈕規格 (Buttons)

| 類型 | 高度 | 圓角 | 字體 | 顏色 |
|---|---|---|---|---|
| Primary | 38px（用 `span + p-px` 包裹補對齊）| `rounded-full` | 13–14px, fw 550 | white on `#510110` |
| Ghost | 36px | `rounded-full` | 13–14px, fw 450 | `neutral-700` on white, border |
| Quick Pill（Navbar 登入態）| 32px | `rounded-full` | 12px, fw 500 | active → primary；平時 → ghost |
| Outline（橫幅）| 28px | `rounded-full` | 11px, fw 500 | white on transparent，white border |

**按鈕對齊規則**：Primary 與 Ghost 並排時，Primary 用 `span`（`display:inline-flex; padding:1px`）包裹，補償 ring 的 2px 視覺高度差。

---

## 間距與圓角 (Spacing & Radius)

| 元素 | 圓角 |
|---|---|
| 卡片 | `rounded-lg`（8px）|
| 按鈕 | `rounded-full` |
| Logo Mark | `rounded-md`（6px）|
| Badge / Tag | `rounded-full` |
| Card 內 Icon | `rounded-md`（outer radius − padding = 同心圓角）|
| Modal | `rounded-xl` |

**Concentric Radius 原則**：內層圓角 = 外層圓角 − padding（如外層 rounded-lg p-4 → 內層 rounded-sm）

---

## 版面佈局 (Layout Patterns)

### 左對齊優先
- 避免 AI 預設的全置中。
- Hero 採 Split Headline：左 3/5 + 右 2/5，底部對齊。

### Section Heading（Inline）
- 標題與副標放在同一行：深色粗體 + 灰色中等字重。
- 例：`<h2>最新消息</h2> <span>Latest News</span>`（flex + align-items: baseline）

### ch 單位文字寬度
- Hero 描述：`max-w-[40ch]`
- 組織簡介：`max-w-[52ch]`
- Footer 說明：`max-w-[40ch]`

### Canvas Grid 裝飾線
- 每個主要 Section 之間插入 28px 裝飾線區塊
- 水平中線（全寬）+ 垂直 repeating-linear-gradient（48px 間距）

---

## 元件規範速查 (Component Cheatsheet)

| 元件 | 規格摘要 |
|---|---|
| Navbar | h-56px · border-bottom · Logo + 主選單 + Actions |
| 點名橫幅 | primary bg · Live Dot（pulse）· full-width |
| News Card | outer ring 8% · 封面圖 16:9 · 分類 Tag（primary bg，rounded-full，Geist Mono）|
| Activity Featured | 大封面 260px · 完整摘要 + 「閱讀全文 →」|
| Activity Small | 橫排：縮圖 120px + 文字區 |
| Org Highlight Card | white bg · outer ring · 28px Icon（rounded-md，primary accent bg）|
| Footer | 3 欄（2/4 + 1/4 + 1/4）· border-top Footer Bar |
| Admin Sidebar | neutral-950 bg · active 項目 primary 左 3px line |
| Status Badge | rounded-full · 11px Geist Mono · open 綠 · pending 紅 · closed 灰 |
| Data Table Row | h-48px · header neutral-100 · hover primary/5% |
| Modal | 480–560px · overlay rgba(0,0,0,0.4) · rounded-xl · outer ring |
