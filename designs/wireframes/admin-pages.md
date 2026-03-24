# Admin 後台頁面設計描述

> 本文件收錄後台管理系統（`/admin/*`）的頁面佈局文字描述，  
> 供 Stitches 等 AI 設計工具生成設計稿，或供開發時參考。  
> 後台僅限 `role = 'admin'` 的 `@gs.ncku.edu.tw` 帳號存取。  
> 設計規範同前台，參閱 `../../specs/AGENTS.md` 與 `../DESIGN.md`。

---

## 後台共用框架

所有 `/admin/*` 頁面共享以下版型骨架：

```
Admin Layout
├── Sidebar（左側，固定 240px 寬）
│   ├── Logo + 「後台管理」標籤
│   ├── 導覽選單（含 active 狀態）
│   └── 用戶資訊 + 登出
└── Main Content Area（右側，填滿剩餘寬度）
    ├── Page Header（標題 + 主要操作按鈕）
    └── Content
```

**Sidebar 選單項目**（依優先度排序）：

| Icon | 路由 | 名稱 |
|---|---|---|
| 🏠 | `/admin` | Dashboard |
| 📝 | `/admin/content` | 網站內容 |
| 📰 | `/admin/posts` | 文章管理 |
| 📋 | `/admin/forms` | 表單管理 |
| 🎪 | `/admin/forms/[id]/responses` | （從表單展開） |
| 💰 | `/admin/deposit` | 保證金管理 |
| ✅ | `/admin/attendance` | 點名管理 |
| 🏷 | `/admin/clubs` | 社團名單 |
| 👥 | `/admin/users` | 用戶管理 |

**Sidebar 樣式**：neutral-950 深色背景 · 白色文字 · active 項目 primary #510110 左側 3px 粗線 + 淡 primary 背景

---

## 一、社博報名管理（`/admin/forms` + `/admin/deposit`）

> 社博報名為兩段流程：① 填寫報名表單（forms 系統）② 追蹤保證金（deposit 系統）。

### 1-A：表單列表 `/admin/forms`

**Page Header**

- 標題：「表單管理」（24px, font-weight 700, tracking-tight）
- 右側操作：「+ 新增表單」Primary Button（h-36px, rounded-full）

**篩選列**（水平，border-bottom 分隔）

- 狀態篩選 Tabs：全部 / 草稿（draft）/ 開放中（open）/ 已關閉（closed）
- 右側搜尋輸入框（h-36px, rounded-md, border）

**表單列表**（Table 或 Card Grid）

每列顯示：
- 表單名稱（14px, font-weight 600）
- 狀態 Badge（`draft` 灰色 · `open` 綠色 · `closed` 中性灰）
- 回覆數量（回覆 N 筆）
- 截止日期（Geist Mono, 12px, neutral-500）
- 操作按鈕：「編輯」Ghost · 「查看回覆」Ghost · 「複製」Icon Button

**備註**：社博報名表單建立後，提交者（社團）會自動產生 `deposit_records`，狀態初始為 `pending_payment`。

---

### 1-B：表單回覆管理 `/admin/forms/[form_id]/responses`

**Page Header**

- 麵包屑：表單管理 › 113-2 社博報名表單
- 標題：「回覆管理」
- 右側操作：「匯出 CSV」Ghost Button + 狀態摘要（共 N 筆回覆）

**摘要卡片列（Stat Cards Row）**

3 欄橫排統計卡片：
- 總回覆數（白底，neutral-950 大數字）
- 已繳保證金（綠色 accent）
- 待繳（紅色 accent）

**回覆列表**（Data Table）

欄位：社團名稱 / 填寫者 / 提交時間 / 保證金狀態 / 操作

- 保證金狀態 Badge：`pending_payment` 紅色 · `paid` 綠色 · `returned` 灰色
- 操作：「查看詳細」展開 Row 或側邊 Panel

---

### 1-C：保證金管理 `/admin/deposit`

**Page Header**

- 標題：「保證金管理」
- 右側操作：「匯出 CSV」Ghost Button · 「批次更新」Primary Button（有選取時啟用）

**篩選列**

- 狀態篩選 Tabs：全部 / 待繳（紅色計數 Badge）/ 已繳 / 已領回
- 學期 / 表單下拉篩選
- 關鍵字搜尋（社團名稱）

**保證金列表**（Data Table）

| 欄位 | 說明 |
|---|---|
| Checkbox | 批次選取 |
| 社團名稱 | 14px, font-weight 500 |
| 報名表單 | 連結至該表單 |
| 狀態 | Badge（紅 / 綠 / 灰）|
| 金額 | Geist Mono |
| 繳交時間 | Geist Mono, neutral-500（未繳為 `—`）|
| 領回時間 | 同上 |
| 操作 | 狀態機推進按鈕（`pending→paid`：「標記已繳」Primary；`paid→returned`：「標記已領回」Ghost）|

**視覺規則**：
- 未繳（pending）列：左側 3px 紅色 accent border
- 已繳（paid）列：正常顯示
- 已領回（returned）列：文字 neutral-400，降低視覺重量

**狀態機**：`pending_payment → paid → returned`，僅允許 admin 向前推進，不可逆。

**批次操作 Toolbar**（有選取時浮現在列表上方）：

- 「已選取 N 筆」計數 · 「批次標記已繳」Primary · 「取消選取」Ghost

---

## 二、點名管理（`/admin/attendance`）

### 2-A：點名事件列表 `/admin/attendance`

**Page Header**

- 標題：「點名管理」
- 右側操作：「+ 新增點名事件」Primary Button

**事件 Cards Grid**（2 欄）

每張 Card 顯示：
- 事件名稱（16px, font-weight 600）
- 狀態 Badge：`upcoming` 藍色 · `open` 綠色（+ pulse dot）· `closed` 灰色
- 時間範圍（Geist Mono, 12px）
- 出席統計：「已到 X / 預計 Y 個社團」進度條（primary 色填充）
- 操作：「查看詳情」→ 進入事件詳頁

---

### 2-B：點名事件詳頁 `/admin/attendance/[event_id]`

**Page Header**

- 麵包屑：點名管理 › 113-2 第一次代表大會
- 標題 + 狀態 Badge
- 右側操作：「匯出 CSV」Ghost · 「手動補登」Ghost（admin 補點名用）

**即時統計區（Stat Cards Row）**

3 欄：
- 已出席（大數字 + primary 色）
- 缺席
- 預計總數

**出席列表**（Data Table，含即時更新）

| 欄位 | 說明 |
|---|---|
| 社團名稱 | |
| 狀態 | 「已出席」綠色 Badge / 「缺席」灰色 Badge |
| 點名時間 | Geist Mono（缺席為 `—`）|
| 點名者 | 姓名（uid 對應的 display_name）|
| 備註 | 手動補登時顯示原因 |

**手動補登 Modal**

- 觸發：點擊「手動補登」按鈕
- 內容：社團選擇器（club_picker）+ 原因文字欄（required）+ 確認 Button
- 關閉：取消 Ghost Button

---

## 三、社團名單管理（`/admin/clubs`）

### 3-A：社團名單列表 `/admin/clubs`

**Page Header**

- 標題：「社團名單」+ 資料更新時間（Geist Mono, 12px, neutral-500）
- 右側操作：「匯入 YAML / JSON」Primary Button · 「匯出 CSV」Ghost Button

**篩選列**

- 類別 Tabs：全部 / A 系學會 / B 綜合性 / C 學藝性 / D 康樂性 / E 體能性 / F 服務性 / G 聯誼性 / H 自治組織
- 狀態篩選：全部 / 活躍（is_active=true）/ 停辦
- 搜尋框（社團名稱 / 代碼）

**社團列表**（Data Table）

| 欄位 | 說明 |
|---|---|
| 類別碼 | `A`~`H`，Geist Mono Badge |
| 社團名稱 | 14px, font-weight 500 |
| 簡稱 | 12px, neutral-600 |
| 聯絡 Email | 12px, Geist Mono |
| 狀態 | is_active Badge（綠色 / 灰色）|
| 匯入來源 | `yaml_import` / `manual`，Geist Mono, 11px |
| 操作 | 「查看」Ghost |

**分頁**（底部）：共 N 筆，每頁 50 筆，上一頁 / 下一頁

---

### 3-B：YAML / JSON 匯入流程 Modal

> 對應需求文件 §6.4 後台匯入介面行為。

**Step 1 — 上傳檔案**

- Modal 標題：「匯入社團名單」
- 拖放 / 點擊上傳區域（虛線 border，rounded-lg，中央提示文字）
- 支援格式說明：YAML · JSON · schema_version 1.0.0
- 「選擇檔案」Primary Button + 「取消」Ghost Button

**Step 2 — 預覽差異（上傳後）**

- 三欄摘要 Stat Cards：
  - 🟢 新增 N 筆
  - 🟡 更新 M 筆
  - ⚪ 無變動 K 筆
- 差異列表 Table（可展開）：
  - 每列左側 Badge：`新增` 綠色 / `更新` 橙色 / `無變動` 灰色
  - 顯示 id、name、category
- 「確認匯入」Primary Button + 「取消」Ghost Button

**Step 3 — 匯入進行中**

- 進度條（linear，primary #510110 填充）
- 狀態文字：「正在寫入 Firestore...（X / Y）」

**Step 4 — 完成**

- 成功訊息（綠色 accent）：「已成功匯入 N 筆社團資料」
- 操作日誌摘要：操作者 / 時間 / 新增+更新筆數
- 「關閉」Button

---

## 四、後台 Dashboard `/admin`

**版型**：4 欄統計卡片 + 2 個快速列表 Widget

**統計卡片 Row（4 欄）**

| 卡片 | 數值 | 說明 |
|---|---|---|
| 已登記社團 | N 個 | is_active = true 計數 |
| 開放中表單 | N 個 | status = open 計數 |
| 待繳保證金 | N 筆 | deposit pending_payment 計數 |
| 今日點名出席率 | N% | 最近一次 open 事件的出席率 |

**快速列表 Widget（2 欄）**

- 左：最近 5 筆表單回覆（社團名稱 + 表單名稱 + 時間）
- 右：待繳保證金清單（前 5 筆，紅色 accent，含「前往處理」連結）

**設計備註**：統計數字 font-size 32px · tracking-tight · neutral-950；卡片 outer ring gray-950/8%

---

## Stitches Prompt 補充（後台通用）

```
後台頁面採用雙欄 Layout：
左側 Sidebar 240px 寬，neutral-950 深色背景，白色文字，
active 項目以 primary #510110 左側 3px border + 淡 primary 背景標示。

主內容區 white 背景，Page Header 包含頁面標題（24px, font-weight 700, tracking-tight）
與右側主要操作按鈕（Primary Button h-36px rounded-full）。

Data Table 行高 48px，header 行 neutral-100 背景，
偶數列 neutral-50 背景，行 hover 狀態 primary accent 5% 背景。
Status Badge 使用 rounded-full，font-size 11px，Geist Mono，
不同狀態對應顏色：open/active 綠色、pending 紅色、closed/returned 灰色。

所有 Modal 寬度 480-560px，overlay background rgba(0,0,0,0.4)，
Modal 本體 white、rounded-xl、outer ring gray-950/10%。
```
