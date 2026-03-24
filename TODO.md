# NCKU NCA 官方平台 — 開發追蹤

> 技術棧：Next.js 16+ (App Router) · Tailwind CSS 4.x · Firebase · Heroicons · Zustand · React Hook Form + Zod  
> 最後更新：2026-03-24

---

## Phase 1：基礎設施 (Infrastructure)

### 1.1 專案初始化
- [x] 建立 Next.js 16 App Router 專案（TypeScript）
- [x] 安裝並設定 Tailwind CSS 4（含主題色 `#510110` 配置）
- [x] 安裝 Heroicons
- [x] 安裝 Zustand（全域狀態管理）
- [x] 安裝 React Hook Form + Zod（表單驗證）
- [x] 安裝 Firebase SDK（firebase, firebase-admin）
- [x] 安裝 Markdown 生態系（unified, remark, rehype）
- [x] 設定 TypeScript 嚴格模式
- [x] 設定 ESLint

### 1.2 Firebase 設定
- [x] 建立 Firebase 設定檔（`lib/firebase.ts` — Client SDK，延遲初始化）
- [x] 建立 Firebase Admin 設定檔（`lib/firebase-admin.ts` — Server SDK，延遲初始化）
- [x] 設定 `.env.example` 環境變數模板
- [x] 設定 `next.config.ts`（remotePatterns for Firebase Storage + Google）

### 1.3 認證系統
- [x] 實作 Google OAuth 登入（Firebase Auth）
- [x] 實作 `@gs.ncku.edu.tw` Email 後綴驗證
- [x] 實作 AuthContext / AuthProvider（React Context + 動態 import）
- [x] 建立 Next.js Middleware（`/admin/*` 路由保護）
- [x] 實作 Custom Claims API（`/api/auth/claims`）
- [x] Session Cookie API（`/api/auth/session` — POST/DELETE）
- [x] ISR Revalidation API（`/api/revalidate`）
- [x] Zustand auth UI store（`lib/auth-store.ts`）
- [x] 登入頁面（`/login`）

### 1.4 共用 Layout 元件
- [x] Navbar（匿名態 + 登入態 + 快速入口 + 行動裝置漢堡選單）
- [x] Footer（3 欄 Grid + Footer Bar + 社群圖示）
- [x] Attendance Banner（條件顯示 + Live Dot 脈搏動畫）
- [x] Public Layout（組合 Navbar + Banner + Footer）
- [x] Admin Layout（Sidebar + Main Content Area）
- [x] Admin Sidebar（深色背景 + active 狀態 + 導覽選單）
- [x] Canvas Grid 裝飾線分隔元件

### 1.5 設計系統元件庫
- [x] Button 元件（Primary / Ghost / Outline / Pill + p-px 對齊補償）
- [x] Badge 元件（success / warning / neutral / primary）
- [x] Card 元件（outer ring + hoverable + Header/Body/Footer）
- [x] Section Heading（Inline 標題 + 副標）
- [x] Modal 元件（Portal-based, 480–560px, overlay, ESC 關閉）
- [x] Data Table 元件（行高 48px, header, hover, checkbox 多選）
- [x] Loading Spinner / Skeleton
- [x] Stat Card（32px 數字 + accent + outer ring）

### 1.6 TypeScript 類型定義
- [x] User / Post / Club / SiteContent types
- [x] Form / FormField / FormResponse / DependsOn types
- [x] DepositRecord / AttendanceEvent / AttendanceRecord types

---

## Phase 2：前台公開頁面 (Frontend)

### 2.1 首頁 `/`
- [x] Hero Section（Split 3/5:2/5 + Eyebrow + CTA + 統計列表）
- [x] 組織簡介 Section（使命文字 + 四大職能 Cards 2x2 Grid）
- [x] 最新消息預覽 Section（3 欄 News Cards + mock data）
- [x] 活動回顧預覽 Section（不對稱版型：1 Featured + 2 Small）
- [x] Canvas Grid 裝飾線分隔
- [ ] 點名橫幅整合（需接入 Auth Context 的登入狀態）
- [ ] RWD 響應式微調

### 2.2 關於我們 `/about`
- [x] Eyebrow + Hero 標題
- [x] 組織介紹內容（核心業務、歷史沿革、聯繫方式）
- [x] Markdown 排版
- [ ] CMS 內容讀取（Firestore `site_content`）

### 2.3 組織章程 `/charter`
- [x] Hero + 標題
- [x] 兩欄版型：左側 sticky TOC + 右側章程內容
- [x] 錨點導航（六章十八條）
- [ ] CMS 內容讀取

### 2.4 幹部成員 `/members`
- [x] Hero + 標題
- [x] 會長團 + 四部門卡片清單（mock data）
- [x] 成員卡片：頭像首字、姓名、職稱、email
- [ ] CMS 內容讀取

### 2.5 最新消息 `/news`
- [x] 消息列表頁（分類 tabs + 3 欄 grid + mock data 8 筆）
- [x] 分頁器
- [x] 單篇消息頁 `/news/[slug]`（麵包屑 + 文章標頭 + 內容 + 側欄相關文章）
- [x] SEO Metadata + OG 標籤
- [x] generateStaticParams
- [ ] 接入 Firestore 真實資料

### 2.6 活動回顧 `/activities`
- [x] 活動列表頁（分類 tabs + grid + mock data 7 筆）
- [x] 分頁器
- [x] 單篇活動頁 `/activities/[slug]`（同 news 版型）
- [x] SEO Metadata + OG 標籤
- [x] generateStaticParams
- [ ] 接入 Firestore 真實資料

### 2.7 公開表單 `/forms/[form_id]`
- [x] 表單頁面結構（標題 + 描述 + 欄位預覽 + mock data）
- [x] 表單已截止狀態處理
- [ ] 表單 Schema 動態渲染（JSON → React 元件）
- [ ] 條件邏輯（depends_on）前端計算
- [ ] 預填值（default_from_user）
- [ ] 提交驗證 + 防重複 Transaction

### 2.8 SEO
- [x] 每頁 title / description / og 基礎設定
- [ ] `/sitemap.xml` 生成
- [ ] `/robots.txt`
- [ ] Canonical URL
- [ ] 動態 og:image（next/og）

---

## Phase 3：後台管理系統 (Admin)

### 3.1 Dashboard `/admin`
- [x] 4 欄統計卡片（社團數 / 開放表單 / 待繳保證金 / 點名出席率）
- [x] 最近 5 筆表單回覆 Widget
- [x] 待繳保證金清單 Widget
- [x] 接入 Firestore 真實資料

### 3.2 網站內容管理 `/admin/content`
- [x] 頁面列表 UI（圖示 + 描述 + 編輯按鈕）
- [x] 各頁面內容 CRUD（FormModal 內嵌 Markdown 編輯）
- [ ] 富文本 Markdown 編輯器（Milkdown 或 TipTap）
- [ ] 圖片上傳整合（Firebase Storage）
- [ ] 儲存並發布 + ISR 觸發

### 3.3 文章管理 `/admin/posts`
- [x] 文章列表 UI（狀態 tabs + 搜尋 + 表格 + mock data）
- [x] 文章 CRUD（新增 / 編輯 / 刪除 Modal）
- [x] 狀態切換（draft ↔ published）
- [ ] Markdown 編輯器 + 封面圖上傳
- [ ] Slug 自動生成優化（可評估翻譯服務或 LLM，自動產生多語意/可讀性更高的 slug）

### 3.4 表單管理 `/admin/forms`
- [x] 表單列表 UI（狀態 tabs + 搜尋 + mock data）
- [x] 表單 CRUD（新增 / 編輯 / 刪除 Modal）
- [ ] 表單欄位拖曳排序（JSON Schema 編輯器）
- [ ] 條件邏輯設定 UI
- [ ] 表單模板（社博 / 寒假場協 / 一般報名 / 出席調查）
- [ ] 回覆管理頁面 `/admin/forms/[form_id]/responses`
- [ ] 回覆匯出 CSV

### 3.5 保證金管理 `/admin/deposit`
- [x] 保證金列表 UI（狀態 tabs + 表格 + mock data）
- [x] 狀態機操作（pending → paid → returned）接入 Firestore
- [x] 批次操作 Toolbar（checkbox 多選 + 批次標記/退還）
- [x] 備註編輯 Modal
- [ ] CSV 匯出

### 3.6 點名管理 `/admin/attendance`
- [x] 點名事件列表 UI（Cards Grid + 進度條 + mock data）
- [x] 新增點名事件（FormModal）
- [x] 編輯點名事件
- [x] 狀態快速切換（upcoming→open→closed）
- [ ] 事件詳頁（`/admin/attendance/[event_id]`）
- [ ] 即時出席統計 + 出席列表
- [ ] 手動補點名 Modal
- [ ] CSV 匯出

### 3.7 社團名單管理 `/admin/clubs`
- [x] 社團列表 UI（分類 tabs + 搜尋 + 表格 + mock data）
- [x] 社團編輯 Modal（單一社團 CRUD）
- [x] JSON 匯入流程 Modal（上傳 → 預覽 → 結果）
- [x] Firestore 批次寫入
- [x] 新增單一社團 API Route（GET/PUT `/api/admin/clubs/[clubId]`）
- [ ] YAML 匯入支援
- [ ] YAML / JSON 匯出

### 3.8 用戶管理 `/admin/users`
- [x] 用戶列表 UI（角色 tabs + 表格 + mock data）
- [x] 角色指派功能（ConfirmDialog + API 串接）
- [x] 關聯社團設定（FormModal）

---

## Phase 4：API Routes & Firebase 串接

### 4.1 API Routes
- [x] `/api/revalidate` — ISR On-demand Revalidation
- [x] `/api/auth/session` — Session Cookie 管理（POST + DELETE）
- [x] `/api/auth/claims` — Custom Claims RBAC
- [ ] `/api/forms/[form_id]/submit` — 表單提交（含防重複 Transaction）
- [ ] `/api/attendance/checkin` — 點名提交（含防重複 Transaction）
- [ ] `/api/clubs/import` — 社團 YAML/JSON 匯入
- [ ] `/api/export/csv` — CSV 匯出通用接口

### 4.2 Firestore 資料層
- [x] 建立 Firestore 資料存取函數庫（`lib/firestore/`）
- [x] posts CRUD
- [x] clubs CRUD + 匯入
- [x] forms CRUD + responses
- [x] deposit_records CRUD + 狀態機
- [x] attendance_events + records CRUD
- [x] users CRUD
- [x] site_content CRUD

### 4.3 Cloud Functions
- [ ] 表單提交後自動建立 deposit_record
- [ ] 表單統計計數更新
- [ ] ISR 觸發 Webhook

### 4.4 Firestore Security Rules
- [x] 全路徑 deny-by-default
- [x] admin RBAC 驗證
- [x] 表單回覆 create-only
- [x] 點名 uid 一致性驗證
- [ ] 複合索引設定

### 4.5 Firebase Storage Security Rules
- [x] 文章圖片公開讀取、管理員寫入
- [x] 表單附件使用者隔離
- [x] 網站內容圖片管理
- [x] 社團匯入檔案管理
- [x] 匯出檔案管理
- [x] 檔案類型與大小驗證

### 4.6 資料種子腳本
- [x] 格式化原始 Markdown 資料檔案（data/formatted/）
- [x] Firestore seed script（site_content + clubs 寫入）

---

## Phase 5：SEO 優化與上線準備

- [ ] Sitemap.xml + Robots.txt
- [ ] 效能優化（Firestore 索引、ISR revalidate 間隔）
- [ ] Lighthouse 審查（Performance / Accessibility / SEO）
- [ ] 安全性審查（XSS / CSRF / Token 保護）
- [ ] Vercel 部署設定
- [ ] 環境變數設定（Production / Preview / Development）
- [ ] Firebase Emulator 本地開發設定
- [ ] 最終測試

---

## 當前進度

| Phase   | 狀態         | 說明                                                 |
| ------- | ------------ | ---------------------------------------------------- |
| Phase 1 | ✅ 完成       | 基礎設施、元件庫、認證系統、Layout                   |
| Phase 2 | 🔄 大部分完成 | 所有前台頁面 UI 已建立，待接入 Firestore 資料        |
| Phase 3 | 🔄 CRUD 完成  | 所有後台頁面已接入 API CRUD，共用元件模組化完成      |
| Phase 4 | 🔄 大部分完成 | API Routes + 資料層 + Security Rules + Seed 腳本完成 |
| Phase 5 | ⏳ 待開始     | 優化與上線                                           |

---

## 專案結構

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 根 Layout（Inter + Geist Mono + AuthProvider）
│   │   ├── globals.css             # Tailwind CSS 4 主題（#510110 酒紅色系）
│   │   ├── page.tsx                # 首頁
│   │   ├── login/page.tsx          # 登入頁
│   │   ├── about/page.tsx          # 關於我們
│   │   ├── charter/page.tsx        # 組織章程（TOC + 錨點）
│   │   ├── members/page.tsx        # 幹部成員
│   │   ├── news/page.tsx           # 最新消息列表
│   │   ├── news/[slug]/page.tsx    # 單篇消息
│   │   ├── activities/page.tsx     # 活動回顧列表
│   │   ├── activities/[slug]/page.tsx # 單篇活動
│   │   ├── forms/[form_id]/page.tsx   # 公開表單
│   │   ├── admin/
│   │   │   ├── layout.tsx          # Admin Layout（Sidebar）
│   │   │   ├── page.tsx            # Dashboard
│   │   │   ├── content/page.tsx    # 網站內容管理
│   │   │   ├── posts/page.tsx      # 文章管理
│   │   │   ├── forms/page.tsx      # 表單管理
│   │   │   ├── deposit/page.tsx    # 保證金管理
│   │   │   ├── attendance/page.tsx # 點名管理
│   │   │   ├── clubs/page.tsx      # 社團名單
│   │   │   └── users/page.tsx      # 用戶管理
│   │   └── api/
│   │       ├── auth/session/route.ts   # Session Cookie
│   │       ├── auth/claims/route.ts    # Custom Claims
│   │       └── revalidate/route.ts     # ISR Revalidation
│   ├── components/
│   │   ├── ui/                     # 設計系統元件庫（9 個元件）
│   │   ├── layout/                 # Navbar / Footer / Banner / PublicLayout
│   │   ├── home/                   # 首頁 Section 元件（4 個）
│   │   └── admin/                  # Admin Sidebar + 共用管理元件
│   │       ├── sidebar.tsx         # Admin Sidebar
│   │       └── shared/             # 共用管理元件（8 個）
│   │           ├── admin-page-header.tsx   # 頁面標題 + 操作按鈕
│   │           ├── admin-filter-bar.tsx    # Pill tabs + 搜尋列
│   │           ├── confirm-dialog.tsx      # 確認對話框
│   │           ├── form-modal.tsx          # 表單 Modal
│   │           ├── form-field.tsx          # 表單欄位元件
│   │           ├── admin-empty-state.tsx   # 空狀態
│   │           ├── admin-loading-state.tsx # 載入骨架
│   │           └── admin-error-state.tsx   # 錯誤狀態
│   ├── lib/
│   │   ├── firebase.ts             # Firebase Client（延遲初始化）
│   │   ├── firebase-admin.ts       # Firebase Admin（延遲初始化）
│   │   ├── auth-context.tsx        # AuthProvider + useAuth
│   │   ├── auth-store.ts           # Zustand UI state
│   │   └── firestore/              # Firestore 資料存取層（8 個模組）
│   │       ├── index.ts            # Re-export
│   │       ├── site-content.ts     # site_content CRUD
│   │       ├── posts.ts            # posts CRUD
│   │       ├── clubs.ts            # clubs CRUD + 批次匯入
│   │       ├── users.ts            # users CRUD
│   │       ├── forms.ts            # forms + responses CRUD
│   │       ├── deposits.ts         # deposit_records CRUD + 狀態機
│   │       └── attendance.ts       # attendance_events + records CRUD
│   ├── types/
│   │   └── index.ts                # 全專案 TypeScript 類型
│   └── middleware.ts               # /admin/* 路由保護
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 已建立的檔案數

- **49 個原始碼檔案**
- **29 個頁面路由**（含 SSG 動態路由）
- **3 個 API Routes**
- **9 個 UI 元件**
- **4 個 Layout 元件**
- **4 個首頁 Section 元件**

## 技術決策記錄

| 項目                | 決策                         | 原因                                          |
| ------------------- | ---------------------------- | --------------------------------------------- |
| Firebase SDK 初始化 | 延遲初始化（lazy）           | 避免 SSG 建構時因缺少環境變數而失敗           |
| Auth 模組導入       | 動態 import                  | 防止 `firebase/auth` 在伺服器端靜態生成時執行 |
| Session 管理        | HttpOnly Cookie（5天）       | 安全性考量，防止 XSS 竊取 Token               |
| 設計系統            | Tailwind CSS 4 @theme inline | 統一色彩系統，支援 CSS custom properties      |
| 字體                | Inter Variable + Geist Mono  | 符合 AGENTS.md 設計規範                       |
