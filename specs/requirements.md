# 成功大學社團聯合會 官方平台需求文件

**NCKU Student Federation Official Platform — Requirements**
版本 v1.1 · 2026-03

---

#社團之所在#社聯之所在國立成功大學社團聯合會
Club Association of National Cheng Kung University

## 0. 登入限制與安全性

### 0.1 登入方式
- **僅限 Google Auth**: 系統目前僅開放 Google 帳號登入，不提供其他登入方式。

### 0.2 學校 Email 驗證
- **後綴限制**: 登入後，系統必須驗證該 Google 帳號的 Email 後綴是否為 `@gs.ncku.edu.tw`。
- **存取控制**: 若非該後綴之帳號，系統應立即阻擋其存取權限並顯示錯誤提示，確保僅限成大校內人員使用。

---

## 目錄

1. [專案概覽](#1-專案概覽)
2. [技術架構](#2-技術架構)
3. [資料庫設計（Firestore）](#3-資料庫設計firestore)
4. [功能規格](#4-功能規格)
5. [表單製作功能](#5-表單製作功能)
6. [點名功能](#6-點名功能)
7. [規格補充與技術注意事項](#7-規格補充與技術注意事項)
8. [開發里程碑建議](#8-開發里程碑建議)
9. [待確認事項（Open Questions）](#9-待確認事項open-questions)

---

## 1. 專案概覽

本文件為成功大學社團聯合會（以下簡稱「社聯會」）官方數位平台之完整系統規格，涵蓋前台公開網站、後台管理系統、表單製作模組及點名模組的技術架構、資料模型與功能需求定義。

### 1.1 核心目標

- 建立高質感、扁平化設計之官方形象網站，對外展示組織資訊。
- 提供 CMS 後台，讓管理員以 Markdown 更新網站內容，並透過 Next.js ISR 產生靜態頁面，同時兼顧 SEO 及效能。
- 實作客製化表單系統，取代外部工具（如 Google 表單），整合社博報名與保證金追蹤。
- 線上點名系統，支援多裝置同步，取代紙本點名。

### 1.2 設計原則

- 扁平化（Flat Design）、高質感視覺風格。
- Mobile-first，全站 RWD。
- SEO 友好：靜態頁面（ISR）、結構化 Metadata、Sitemap。
- 資料分離：模板資料與用戶填寫資料各自獨立。
- 防重複機制：保證金繳交與點名均有唯一性保護。

### 1.3 視覺規範

| 項目                 | 值                                                                    |
| -------------------- | --------------------------------------------------------------------- |
| 主色（Primary）      | `#510110`（酒紅色）                                                   |
| 背景色（Background） | `#FFFFFF`（白色）                                                     |
| 邊界 / 分隔線        | 淡灰色，建議 `#E5E7EB`                                                |
| 字體                 | 系統字體堆疊（`-apple-system`, `BlinkMacSystemFont`, `Noto Sans TC`） |
| 設計風格             | 扁平化，無陰影或低陰影，圓角適中（`rounded-md`）                      |

**Tailwind CSS 主題配置（`tailwind.config.ts` 節錄）：**

```ts
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#510110',
        light: '#7a0118',
        dark: '#3a000b',
      },
      border: '#E5E7EB',
    },
  },
},
```

---

## 2. 技術架構

### 2.1 技術選型總覽

| 層次 / 功能          | 技術選型 / 說明                                                         |
| -------------------- | ----------------------------------------------------------------------- |
| 前端框架             | Next.js 14+（App Router）                                               |
| 渲染策略             | ISR（Incremental Static Regeneration）+ On-demand Revalidation          |
| 後端服務             | Firebase（Firestore、Authentication、Storage、Cloud Functions）         |
| **部署平台**         | **Vercel**（原生支援 Next.js ISR；Firebase Hosting 不支援 ISR，不採用） |
| Markdown 解析        | unified / remark / rehype 生態系                                        |
| 後台 Markdown 編輯器 | Milkdown 或 TipTap（支援 Markdown 語法及富文本切換）                    |
| CSS 框架             | Tailwind CSS 4.x                                                        |
| 狀態管理             | Zustand（輕量全域狀態）                                                 |
| 表單驗證             | React Hook Form + Zod                                                   |
| 認證方式             | Firebase Auth — Google OAuth（唯一，限 @gs.ncku.edu.tw）                |
| 圖片處理             | next/image + Firebase Storage 存放 Uploaded Media                       |
| TypeScript           | 全專案採用 TypeScript，強型別保障                                       |

### 2.2 ISR 更新機制

當管理員在後台儲存內容後，前端觸發 ISR 重新生成對應靜態頁面，流程如下：

1. 管理員在後台點擊「儲存並發布」。
2. Next.js API Route（`/api/revalidate`）被呼叫，攜帶 `REVALIDATE_SECRET` token 做驗證。
3. API Route 呼叫 `revalidatePath()` 或 `revalidateTag()`，指定需要更新的路徑。
4. Next.js 在背景非同步重新生成靜態頁面，訪客不會感受到中斷。

> Vercel 的 On-demand ISR 為免費功能，不需要額外服務。

### 2.3 Firebase 服務配置

| Firebase 服務     | 用途                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Firestore         | 主要資料庫，儲存所有結構化資料（文章、表單、點名、社團、用戶）                              |
| Firebase Auth     | 身份驗證，僅限 Google OAuth，並驗證 `@gs.ncku.edu.tw` 後綴，自訂 Custom Claims 實作角色權限 |
| Firebase Storage  | 儲存 Markdown 文章內嵌圖片、附件、社團資料匯入的原始檔案                                    |
| Cloud Functions   | 處理 Firestore Triggers（如表單提交後自動更新統計）及 ISR 觸發 Webhook                      |
| Firebase Emulator | 本地開發時完整模擬 Firestore / Auth / Storage，無需連線正式環境                             |

### 2.4 安全性架構

#### 2.4.1 角色與權限（RBAC）

以 Firebase Auth Custom Claims 儲存用戶角色，並在 Firestore Security Rules 中驗證。

| 角色          | 權限範圍                                                        |
| ------------- | --------------------------------------------------------------- |
| `admin`       | 可存取所有後台功能：CMS、表單管理、點名管理、社團管理、用戶管理 |
| `club_member` | 可填寫表單、進行點名、查看自己的填寫紀錄；不可進入後台          |
| `anonymous`   | 僅可瀏覽公開前台頁面                                            |

#### 2.4.2 Firestore Security Rules 設計原則

- 所有 `write` 操作預設 `deny`，明確開放的路徑才允許。
- admin 角色的判斷來自 `request.auth.token.role == 'admin'`。
- 表單回覆只允許 `create`，不允許用戶修改或刪除已提交的資料。
- 點名操作需驗證 `userId` 與 `request.auth.uid` 一致，防止代替他人點名。

---

## 3. 資料庫設計（Firestore）

所有資料均儲存於 Cloud Firestore，採用階層式 Collection / Sub-Collection 架構。

### 3.1 Collection 總覽

| Collection 路徑                                    | 說明                                                          |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `site_content/{page_id}`                           | 前台各頁面的 Markdown 內容及 Metadata（首頁、章程、成員等）   |
| `posts/{post_id}`                                  | 最新消息 / 活動回顧文章，含 Markdown 正文、封面圖、標籤、狀態 |
| `clubs/{club_id}`                                  | 社團名單，含社團詳細資料（見 §3.3）                           |
| `users/{uid}`                                      | 平台用戶資料，含角色、關聯社團、姓名                          |
| `forms/{form_id}`                                  | 表單模板（Schema），定義欄位結構與依賴關係                    |
| `forms/{form_id}/responses/{response_id}`          | 用戶填寫的表單回覆                                            |
| `deposit_records/{record_id}`                      | 保證金繳交 / 領取紀錄，含狀態機欄位                           |
| `attendance_events/{event_id}`                     | 點名事件定義                                                  |
| `attendance_events/{event_id}/records/{record_id}` | 各社團的點名紀錄                                              |

### 3.2 posts（最新消息 / 活動回顧）

| 欄位               | 型別 / 說明                                |
| ------------------ | ------------------------------------------ |
| `id`               | Auto ID                                    |
| `title`            | `string` — 文章標題                        |
| `slug`             | `string` — URL 友好識別碼（唯一）          |
| `category`         | `string` — `'news'` \| `'activity_review'` |
| `cover_image_url`  | `string` — Firebase Storage 圖片 URL       |
| `content_markdown` | `string` — Markdown 全文                   |
| `tags`             | `string[]` — 標籤陣列                      |
| `status`           | `string` — `'draft'` \| `'published'`      |
| `published_at`     | `Timestamp`                                |
| `updated_at`       | `Timestamp`                                |
| `author_uid`       | `string` — 發布者 UID                      |

> **注意**：Firestore document 上限為 1 MiB。一般 Markdown 文章通常在 50–200 KB 以內，可直接存於 Firestore。若日後有長篇文章超過 512 KB，建議改存 Firebase Storage，Firestore 只存 `storage_path` 參考路徑。

### 3.3 clubs（社團名單）

社團資料來源為學校平台爬取腳本，以 YAML / JSON 格式整理後匯入，詳細匯入規範見 §6.4。

| 欄位               | 型別 / 說明                                                  |
| ------------------ | ------------------------------------------------------------ |
| `id`               | `string` — 社團代碼（由匯入腳本標準化，建議使用學校平台 ID） |
| `name`             | `string` — 社團全名                                          |
| `short_name`       | `string` — 簡稱                                              |
| `category`         | `string` — 社團類別（學術、藝文、體育、服務等）              |
| `contact_person`   | `string` — 聯絡幹部姓名                                      |
| `contact_email`    | `string`                                                     |
| `contact_phone`    | `string?`                                                    |
| `description`      | `string?` — 社團簡介                                         |
| `established_year` | `number?` — 創立年份                                         |
| `is_active`        | `boolean` — 本學期是否活躍                                   |
| `import_source`    | `string` — `'manual'` \| `'yaml_import'` \| `'json_import'`  |
| `raw_data`         | `object` — 原始匯入資料（保留所有欄位，供未來 re-mapping）   |
| `imported_at`      | `Timestamp` — 最後匯入時間                                   |

### 3.4 users（平台用戶）

| 欄位           | 型別 / 說明                                             |
| -------------- | ------------------------------------------------------- |
| `uid`          | `string` — Firebase Auth UID（同 document ID）          |
| `display_name` | `string` — 姓名                                         |
| `email`        | `string`                                                |
| `role`         | `string` — `'admin'` \| `'club_member'`                 |
| `club_id`      | `string?` — 預設關聯社團 ID（填表時自動預填，仍可修改） |
| `created_at`   | `Timestamp`                                             |

> **設計決策**：`club_id` 為「建議值」而非「鎖定值」。填寫表單時自動預填社團資訊，但幹部仍可手動更改（因可能換社團）。

### 3.5 forms（表單模板 Schema）

| 欄位              | 型別 / 說明                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`              | Auto ID                                                                                                                                    |
| `title`           | `string` — 表單名稱                                                                                                                        |
| `description`     | `string` — 說明文字（支援 Markdown）                                                                                                       |
| `form_type`       | `string` — `'expo_registration'` \| `'winter_association_registration'` \| `'general_registration'` \| `'attendance_survey'` \| `'custom'` |
| `status`          | `string` — `'draft'` \| `'open'` \| `'closed'`                                                                                             |
| `settings`        | `object` — 表單全域設定（每社團限填一次、截止日期、預填策略等）                                                                            |
| `deposit_policy`  | `object` — 保證金設定（見下方說明）                                                                                                        |
| `fields`          | `FormField[]` — 欄位定義陣列（見 §5.1）                                                                                                    |
| `created_by`      | `string` — admin UID                                                                                                                       |
| `created_at`      | `Timestamp`                                                                                                                                |
| `closes_at`       | `Timestamp?` — 截止時間                                                                                                                    |
| `revalidate_path` | `string` — ISR 重新生成路徑                                                                                                                |

`deposit_policy` 建議結構：

- `required: boolean` — 是否需要保證金（`true` 則需建立保證金流程，`false` 則完全不啟用）。
- `amount: number?` — 保證金金額，`required=true` 時必填。
- `binding_mode: 'linked_to_response' | 'independent'` — 是否與表單回覆綁定運作。
- `refund_rule: string?` — 退還規則描述（可顯示於前台說明）。

### 3.6 deposit_records（保證金紀錄）

| 欄位               | 型別 / 說明                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| `id`               | Auto ID                                                                   |
| `club_id`          | `string` — 關聯社團                                                       |
| `form_response_id` | `string?` — 來源表單回覆 ID（`binding_mode='linked_to_response'` 時必填） |
| `status`           | `string` — `'pending_payment'` \| `'paid'` \| `'returned'`（狀態機）      |
| `amount`           | `number` — 保證金金額                                                     |
| `paid_at`          | `Timestamp?` — 繳交時間（由 admin 標記）                                  |
| `returned_at`      | `Timestamp?` — 領回時間（由 admin 標記）                                  |
| `notes`            | `string?` — 備註                                                          |
| `updated_by`       | `string` — 最後操作的 admin UID                                           |

> **狀態機**：`pending_payment → paid → returned`，僅允許 admin 向前推進，不可逆（確保審計追蹤）。

> **建立時機**：僅當該表單 `deposit_policy.required=true` 才建立 `deposit_records`。  
> **綁定規則**：`binding_mode='linked_to_response'` 時由送出表單自動建立；`binding_mode='independent'` 時由管理員手動建立與維護。

### 3.7 attendance_events / records（點名）

#### attendance_events

| 欄位             | 型別 / 說明                                           |
| ---------------- | ----------------------------------------------------- |
| `id`             | Auto ID                                               |
| `title`          | `string` — 點名事件名稱（如「113-2 第一次代表大會」） |
| `description`    | `string?`                                             |
| `status`         | `string` — `'upcoming'` \| `'open'` \| `'closed'`     |
| `expected_clubs` | `string[]` — 預計出席社團 ID 陣列                     |
| `opens_at`       | `Timestamp` — 點名開放時間                            |
| `closes_at`      | `Timestamp` — 點名截止時間                            |
| `created_by`     | `string` — admin UID                                  |

#### attendance_records（Sub-Collection）

| 欄位                   | 型別 / 說明                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `id`                   | Auto ID                                                      |
| `club_id`              | `string`                                                     |
| `user_uid`             | `string` — 點名者 UID                                        |
| `checked_in_at`        | `Timestamp`                                                  |
| `device_info`          | `string?` — UA string，輔助異常偵測                          |
| `is_duplicate_attempt` | `boolean` — 若重複點名，標記 `true` 並拒絕，仍留下紀錄供稽核 |

> **防重複機制**：以 `club_id + event_id` 複合唯一性做 Firestore Transaction 保護，寫入前先 query 同社團同事件的 records，確認無記錄才允許寫入。此操作必須包在 Firestore Transaction 中，避免競態條件（Race Condition）。

---

## 4. 功能規格

### 4.1 公開前台（Frontend）

#### 4.1.1 頁面清單

| 路徑                 | 說明                                                     |
| -------------------- | -------------------------------------------------------- |
| `/`                  | 英雄區塊、組織簡介、最新消息預覽、活動回顧預覽、聯絡資訊 |
| `/about`             | 組織詳細介紹（Markdown 渲染）                            |
| `/charter`           | 組織章程（Markdown 渲染，支援錨點導航）                  |
| `/members`           | 成員架構（可視化組織架構或卡片清單）                     |
| `/news`              | 最新消息列表（分頁）                                     |
| `/news/[slug]`       | 單篇消息（Markdown 全文、OG 標籤）                       |
| `/activities`        | 活動回顧列表（分頁）                                     |
| `/activities/[slug]` | 單篇活動回顧                                             |
| `/forms/[form_id]`   | 公開表單頁面（ISR 生成）                                 |

#### 4.1.2 SEO 需求

- 每頁需設定 `title`、`description`、`og:image`、`og:title`、`og:description`。
- 文章頁自動生成 `og:image`（可用 `next/og` 動態生成，套用主色 `#510110`）。
- 產生 `/sitemap.xml` 及 `/robots.txt`（Next.js App Router 原生支援）。
- Canonical URL 設定，避免重複內容問題。

### 4.2 後台管理系統（Admin Dashboard）

#### 4.2.1 後台路由架構

| 路由                               | 功能                                   |
| ---------------------------------- | -------------------------------------- |
| `/admin`                           | 後台首頁 Dashboard（統計卡片）         |
| `/admin/content`                   | 網站內容管理（各頁面 Markdown 編輯）   |
| `/admin/posts`                     | 文章管理（新增、編輯、刪除、切換狀態） |
| `/admin/forms`                     | 表單管理（新增、編輯表單）             |
| `/admin/forms/[form_id]/responses` | 表單回覆管理                           |
| `/admin/deposit`                   | 保證金管理 Dashboard                   |
| `/admin/attendance`                | 點名事件管理                           |
| `/admin/clubs`                     | 社團名單管理（含 YAML / JSON 匯入）    |
| `/admin/users`                     | 用戶管理（指派角色）                   |

#### 4.2.2 後台認證保護

- 所有 `/admin/*` 路由均以 Next.js Middleware 保護，未登入自動導向 `/login`。
- 前端登入後取得 Firebase ID Token，後端 API Routes 驗證 token 並檢查 `role == 'admin'`。
- Session 以 HttpOnly Cookie 儲存（使用 `firebase-admin` SDK 建立 session cookie），避免 XSS 竊取 Token。

---

## 5. 表單製作功能

### 5.1 表單 Schema 規格（JSON 格式）

> **設計決策**：表單結構定義採用 **JSON 格式**，而非 Markdown。Markdown 為非結構化文字格式，無法有效表達欄位型別、驗證規則及依賴關係邏輯。JSON Schema 易於程式解析、版本控管，且可擴充。

`FormField` 物件定義如下：

| 欄位                     | 型別 / 說明                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `id`                     | `string` — 欄位唯一識別碼（用於依賴關係引用）                                                      |
| `type`                   | `string` — 欄位類型（見 §5.2）                                                                     |
| `label`                  | `string` — 顯示標籤                                                                                |
| `placeholder`            | `string?` — 輸入提示                                                                               |
| `required`               | `boolean` — 是否必填                                                                               |
| `options`                | `string[]?` — 用於 `select` / `radio` / `checkbox` 類型                                            |
| `validation`             | `object?` — 驗證規則（`min` / `max` / `pattern` / `custom message`）                               |
| `depends_on`             | `DependsOn?` — 條件顯示規則（見 §5.3）                                                             |
| `default_from_user`      | `string?` — 若值為 `'club_name'` / `'email'` / `'club_category'` 等，從用戶 Profile 或社團資料預填 |
| `read_only_if_prefilled` | `boolean?` — 預填後是否鎖定（預設 `false`，允許修改）                                              |
| `order`                  | `number` — 排列順序                                                                                |

> **期初社大 / 代表會類型建議**：`default_from_user` 預設開啟，並將 `read_only_if_prefilled` 預設為 `false`，確保「可快速填寫」與「仍可修正」兩者兼顧。

### 5.2 支援欄位類型

| `type` 值        | 說明                                        |
| ---------------- | ------------------------------------------- |
| `text`           | 單行文字                                    |
| `textarea`       | 多行文字                                    |
| `number`         | 數字                                        |
| `email`          | Email（含格式驗證）                         |
| `phone`          | 電話號碼                                    |
| `select`         | 下拉選單（單選）                            |
| `radio`          | 單選按鈕                                    |
| `checkbox`       | 多選方塊                                    |
| `date`           | 日期選擇器                                  |
| `file`           | 檔案上傳（存 Firebase Storage）             |
| `club_picker`    | 社團選擇器（從 Firestore `clubs` 動態載入） |
| `section_header` | 區段標題（非輸入欄位，純排版用）            |

### 5.3 依賴關係（Conditional Logic）

`depends_on` 物件允許在後台以視覺化方式設定欄位的顯示條件：

| 欄位       | 型別 / 說明                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------- |
| `field_id` | `string` — 被依賴的欄位 ID                                                                  |
| `operator` | `string` — `'equals'` \| `'not_equals'` \| `'contains'` \| `'is_empty'` \| `'is_not_empty'` |
| `value`    | `any` — 比對值                                                                              |
| `action`   | `string` — `'show'` \| `'hide'`（條件成立時的動作）                                         |

**範例**：若「是否攜帶設備」選「是」，則顯示「設備清單」欄位。依賴關係可多層套疊，前端動態計算每個欄位的可見性後再渲染。

### 5.4 表單回覆 Schema

| 欄位                   | 型別 / 說明                                        |
| ---------------------- | -------------------------------------------------- |
| `id`                   | Auto ID                                            |
| `form_id`              | `string` — 關聯表單 ID                             |
| `club_id`              | `string` — 填寫社團                                |
| `submitted_by_uid`     | `string` — 填寫者 UID                              |
| `answers`              | `Record<field_id, any>` — 欄位 ID 對應填寫值的 Map |
| `submitted_at`         | `Timestamp`                                        |
| `is_duplicate_attempt` | `boolean` — 若同社團重複送出，標記並拒絕           |

> **重複提交保護**：以 `form_id + club_id` 複合索引做 Firestore Transaction 保護，確保每個社團每份表單只能提交一份回覆。

### 5.5 保證金管理儀表板

- **適用範圍**：僅對 `deposit_policy.required=true` 的表單顯示保證金管理功能。
- **列表視圖**：以社團為行，顯示「報名狀態」、「保證金狀態」、「繳交時間」、「領回時間」。
- **狀態篩選**：可依 `pending_payment` / `paid` / `returned` 篩選。
- **批次操作**：管理員可選取多個社團，批次更新保證金狀態。
- **匯出功能**：可匯出 CSV 供對帳使用。
- **視覺指示**：用顏色標示狀態（紅：未繳、綠：已繳、灰：已領回），主色系採 `#510110`。

### 5.6 常見表單模板（管理員可直接建立）

#### A. 社博 / 寒假場協（同模板）

> **需求結論**：新增「寒假場協」模板，欄位與社團博覽會報名相同，並支援保證金收退流程。

- `form_type`: `winter_association_registration`（社博可用 `expo_registration`；兩者共用欄位模板）。
- `deposit_policy.required`: `true`
- `deposit_policy.binding_mode`: 建議 `linked_to_response`
- 典型欄位（可依活動微調）：
  - 社團名稱
  - 電話（聯絡方式可選填）
  - Email（聯絡方式可選填）
  - 活動名稱
  - 臉書網址（可選填）
  - 活動區間（如營前訓 / 營期日期區間）
  - 備註

#### B. 普通報名問卷

> **需求結論**：此類問卷不需要保證金，系統必須可關閉保證金流程。

- `form_type`: `general_registration`
- `deposit_policy.required`: `false`
- `deposit_policy.binding_mode`: `independent`（保證金模組不啟用）

#### C. 期初社代會出席調查（快速填寫型）

> **需求結論**：可從使用者註冊資料與社團資料自動帶入預設值，且填寫者可自行調整。

- `form_type`: `attendance_survey`
- `deposit_policy.required`: `false`
- 建議預填欄位：
  - 社團名稱（`default_from_user='club_name'`）
  - 聯絡 Email（`default_from_user='email'`）
  - 社團性質（`default_from_user='club_category'`）
  - 代表姓名（`default_from_user='display_name'`）
- 其餘欄位依活動需求（代表職稱、是否出席、補充說明）配置。

### 5.7 保證金彈性與資料綁定規則

本系統以表單層級設定達成彈性，管理員建立每份問卷時都必須明確設定以下兩項：

1. 是否需要繳交保證金：`deposit_policy.required`
2. 保證金資料是否綁定表單回覆：`deposit_policy.binding_mode`

運作規則如下：

- 當 `required=false`：不建立 `deposit_records`，前後台皆不顯示保證金流程。
- 當 `required=true` 且 `binding_mode='linked_to_response'`：送出表單後自動建立對應保證金紀錄，適合社博 / 寒假場協。
- 當 `required=true` 且 `binding_mode='independent'`：保證金與表單分開維護，由管理員後台建立與更新紀錄。

---

## 6. 點名功能

### 6.1 點名流程

1. 管理員在後台新增點名事件，設定名稱、時間範圍、預計出席社團清單。
2. 系統將事件狀態改為 `open` 時，用戶端開放點名。
3. 社團幹部以手機開啟平台，登入後進入「今日點名」頁面。
4. 確認社團資訊後，點擊「我要點名」送出。
5. 後端 Cloud Function 執行 Firestore Transaction，確認無重複後寫入紀錄。
6. 點名成功後顯示確認畫面，並即時更新管理員儀表板上的出席計數。

### 6.2 點名前台介面

- 用戶登入後，若有進行中的點名事件，首頁顯示顯眼的點名入口橫幅（主色 `#510110`）。
- 點名頁面顯示：事件名稱、用戶所屬社團（可修改）、確認按鈕。
- 點名成功：顯示成功訊息及時間戳記。
- 重複點名：顯示「您的社團已完成本次點名」，並告知點名時間，不允許二次提交。

### 6.3 點名後台管理

- **即時出席統計**：顯示「已到 X / 預計 Y 個社團」。
- **出席列表**：各社團點名狀態（已到 / 缺席），顯示點名時間與操作者。
- **手動補點名**：管理員可為未能線上點名的社團手動補登（須填寫原因）。
- **匯出報表**：點名結果可匯出 CSV。
- **歷史紀錄**：可查詢過往所有點名事件的完整記錄。

### 6.4 社團名單匯入規範

#### 流程概覽

```
學校平台 → 爬取腳本（Python）→ 平台匯入介面 → Firestore
```

#### 匯入規範說明
社團匯入檔案可接受 YAML 或 JSON；本專案以 **YAML** 作為標準交換格式。來源為學校平台 `club0408` 頁面，需涵蓋以下 8 類社團（不含所學會）：

- `A` 系學會
- `B` 綜合性
- `C` 學藝性
- `D` 康樂性
- `E` 體能性
- `F` 服務性
- `G` 聯誼性
- `H` 自治組織

YAML 根節點固定為：

- `meta`：本次匯入批次資訊
- `clubs`：社團資料陣列

##### YAML Schema（v1.0.0）

```yaml
meta:
  source: "https://sys.activity-osa.ncku.edu.tw/index.php?c=club0408"
  source_name: "NCKU Student Club Platform"
  scraped_at: "2026-03-24T08:30:00Z"
  total_clubs: 420
  schema_version: "1.0.0"
  categories:
    - code: "A"
      name: "系學會"
    - code: "B"
      name: "綜合性"
    - code: "C"
      name: "學藝性"
    - code: "D"
      name: "康樂性"
    - code: "E"
      name: "體能性"
    - code: "F"
      name: "服務性"
    - code: "G"
      name: "聯誼性"
    - code: "H"
      name: "自治組織"

clubs:
  - id: "ncku-114a048"
    platform_id: "114A048"
    name: "公共衛生學系系學會"
    name_en: "Department of Public Health Student Association"
    category: "系學會"
    category_code: "A"
    status: "正式"
    email: "nckudphsa@gmail.com"
    president_name: null
    president_name_en: null
    advisor_name: null
    goal: "..."
    description: "..."
    regular_activity_time: "..."
    main_activity_location: "..."
    website_url: null
    import_source: "yaml_import"
    raw_data:
      list_row:
        row_no: "1"
        name_c: "公共衛生學系系學會"
        name_e: "Department of Public Health Student Association"
        status: "正式"
        platform_id: "114A048"
      detail:
        name_c: "公共衛生學系系學會"
        name_e: "Department of Public Health Student Association"
        email: "nckudphsa@gmail.com"
        goal: "..."
        introduce: "..."
        acttime: "..."
        actplace: "..."
        url: ""
```

##### 欄位約束

- `meta.source`、`meta.scraped_at`、`meta.schema_version` 必填。
- `meta.total_clubs` 必須等於 `clubs.length`。
- `clubs[].id` 必填，格式建議：`ncku-` + `platform_id` 小寫（例：`ncku-114a048`）。
- `clubs[].platform_id` 必填，對應學校平台「檢視」按鈕 value。
- `clubs[].category_code` 必填，僅允許 `A`~`H`。
- `clubs[].name` 必填；其餘文字欄位可為 `null`。
- `clubs[].raw_data` 必填，需完整保留來源平台原始欄位，供未來 re-mapping。

##### Firestore Mapping（`clubs/{club_id}`）

- `id` ← `clubs[].id`
- `name` ← `clubs[].name`
- `name_en` ← `clubs[].name_en`
- `category` ← `clubs[].category`
- `status` ← `clubs[].status`
- `email` ← `clubs[].email`
- `description` ← `clubs[].description`
- `website_url` ← `clubs[].website_url`
- `import_source` ← 固定 `'yaml_import'`
- `raw_data` ← `clubs[].raw_data`
- `imported_at` ← 匯入當下 server timestamp（不使用 YAML 內時間覆寫）

#### 匯入腳本職責（`scripts/scrape_ncku_clubs.py`）

爬取腳本輸出的資料需完成以下標準化處理後，方可匯入：

- 產生標準 `id`（建議規則：`ncku-` + 學校平台 ID，全小寫，連字號分隔）。
- 欄位 mapping：將學校平台欄位名稱對應至本系統欄位名稱。
- 保留所有原始欄位至 `raw_data`，確保未來格式異動時可重新 mapping。
- 輸出符合上述規範的 YAML 或 JSON 檔案。
- 記錄 `imported_at` 時間戳記（ISO 8601 格式）。

#### 後台匯入介面行為

1. 管理員上傳 YAML 或 JSON 檔案。
2. 系統解析並顯示「預覽差異」（新增 N 筆、更新 M 筆、無變動 K 筆）。
3. 管理員確認後執行匯入，Firestore 批次寫入（`batch.set`）。
4. 匯入完成後記錄操作日誌，包含操作者 UID、時間、筆數。

---

## 7. 規格補充與技術注意事項

### 7.1 環境設定

- 使用 `.env.local` 管理 Firebase 設定（`NEXT_PUBLIC_FIREBASE_*` 系列）。
- Vercel 環境變數需設定 Production / Preview / Development 三種環境。
- `REVALIDATE_SECRET` 為 ISR 觸發的 API key，需保密存放於環境變數，不可提交至 git。
- Firebase Admin SDK 的 Service Account JSON 同樣存於環境變數（base64 編碼）。

### 7.2 圖片與媒體管理

- Markdown 文章中嵌入的圖片，先上傳至 Firebase Storage，取得永久 URL 後再插入 Markdown。
- 後台 Markdown 編輯器需整合圖片上傳功能（拖拽 / 貼上截圖自動上傳）。
- 前台 `next/image` 需在 `next.config.ts` 的 `remotePatterns` 設定 `firebasestorage.googleapis.com`。

### 7.3 通知系統（後續可擴充）

目前規格未包含通知功能，建議未來納入：

- 表單即將截止提醒（Cloud Function + Email）。
- 保證金狀態變更通知（Email via SendGrid / Nodemailer）。
- 點名事件開始通知（初期可用網站公告取代，降低複雜度）。

### 7.4 錯誤處理與 Loading 狀態

- 所有 Firestore 操作需包含 `try/catch`，提供用戶友好的錯誤提示。
- 表單提交、點名操作需有 loading 狀態指示（按鈕 disabled + spinner）。
- 網路離線時顯示提示，避免靜默失敗。

### 7.5 資料備份策略

- 啟用 Firestore 自動備份（Export to Google Cloud Storage），建議每日一次。
- 備份保留 30 天。
- 重要操作（刪除社團、清除點名紀錄）需二次確認，並記錄操作日誌。

### 7.6 效能優化

- Firestore 查詢需設定複合索引（如 `form_id + club_id` 用於防重複查詢）。
- 文章列表頁 ISR `revalidate` 間隔建議 60–300 秒。
- 後台儀表板的統計數字可使用 Firestore Counter 或定時 Cloud Function 聚合，避免全表掃描。

---

## 8. 開發里程碑建議

| 階段    | 工作項目                                                                                  |
| ------- | ----------------------------------------------------------------------------------------- |
| Phase 1 | 基礎設施建立：Next.js 專案骨架、Firebase 設定、Tailwind 主題（`#510110`）、認證系統、RBAC |
| Phase 2 | 前台公開頁面：首頁、關於、章程、成員、最新消息（含 CMS 後台）                             |
| Phase 3 | 表單系統：表單 Schema 設計、後台表單建立介面、前台填寫頁面、回覆管理                      |
| Phase 4 | 保證金儀表板：狀態機實作、Dashboard UI、CSV 匯出                                          |
| Phase 5 | 點名系統：點名事件管理、手機點名介面、即時統計、社團 YAML/JSON 匯入                       |
| Phase 6 | SEO 優化、效能調校、安全性審查、正式上線                                                  |

---

## 9. 待確認事項（Open Questions）

| 項目            | 狀態     | 說明                                                          |
| --------------- | -------- | ------------------------------------------------------------- |
| Q1 部署平台     | ✅ 確認   | **Vercel**                                                    |
| Q2 社團名單格式 | ✅ 確認   | **爬取腳本 → YAML / JSON 標準格式**（規範見 §6.4）            |
| Q3 品牌主色     | ✅ 確認   | 主色 `#510110`（酒紅色）、背景白色、邊界淡灰色（見 §1.3）     |
| Q4 保證金金額   | ✅ 已確認 | 由 `deposit_policy.amount` 於每份表單設定，可依活動類型調整。 |
| Q5 社博報名表單 | ✅ 已確認 | 支援範本化建立；「社博 / 寒假場協」可共用同一欄位模板。       |
| Q6 多事件點名   | ⏳ 待確認 | 是否可能同日有多個點名事件同時開放？                          |
| Q7 表單填寫權限 | ⏳ 待確認 | 是否所有登入用戶皆可填，或僅限特定社團？                      |
| Q8 通知功能     | ⏳ 待確認 | 是否需要 Email 通知，Phase 幾納入？                           |
| Q9 網域名稱     | ⏳ 待確認 | 已有網域，或需申請？                                          |

---

*成功大學社團聯合會 官方平台系統規格文件 · v1.1 · 2026-03*
