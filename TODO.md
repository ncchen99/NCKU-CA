# NCKU NCA 官方平台 — 開發追蹤

> 技術棧：Next.js 14+ (App Router) · Tailwind CSS 4.x · Firebase · Heroicons · Zustand · React Hook Form + Zod  
> 最後更新：2026-03-24

---

## Phase 1：基礎設施 (Infrastructure)

### 1.1 專案初始化
- [ ] 建立 Next.js 14+ App Router 專案（TypeScript）
- [ ] 安裝並設定 Tailwind CSS（含主題色 `#510110` 配置）
- [ ] 安裝 Heroicons
- [ ] 安裝 Zustand（全域狀態管理）
- [ ] 安裝 React Hook Form + Zod（表單驗證）
- [ ] 安裝 Firebase SDK（firebase, firebase-admin）
- [ ] 安裝 Markdown 生態系（unified, remark, rehype）
- [ ] 設定 TypeScript 嚴格模式
- [ ] 設定 ESLint + Prettier

### 1.2 Firebase 設定
- [ ] 建立 Firebase 設定檔（`lib/firebase.ts` — Client SDK）
- [ ] 建立 Firebase Admin 設定檔（`lib/firebase-admin.ts` — Server SDK）
- [ ] 設定 `.env.local` 環境變數模板（`.env.example`）
- [ ] 設定 `next.config.ts`（remotePatterns for Firebase Storage）

### 1.3 認證系統
- [ ] 實作 Google OAuth 登入（Firebase Auth）
- [ ] 實作 `@gs.ncku.edu.tw` Email 後綴驗證
- [ ] 實作 AuthContext / AuthProvider（React Context）
- [ ] 建立 Next.js Middleware（`/admin/*` 路由保護）
- [ ] 實作 Custom Claims RBAC（admin / club_member）
- [ ] 登入 / 登出 UI 元件

### 1.4 共用 Layout 元件
- [ ] Navbar（匿名態 + 登入態 + 快速入口）
- [ ] Footer（3 欄 Grid + Footer Bar）
- [ ] Canvas Grid 裝飾線分隔元件
- [ ] Admin Layout（Sidebar + Main Content Area）

### 1.5 設計系統元件庫
- [ ] Button 元件（Primary / Ghost / Outline / Pill）
- [ ] Badge 元件（Status Badge：open/pending/closed）
- [ ] Card 元件（News Card / Activity Card / Highlight Card / Stat Card）
- [ ] Section Heading（Inline 標題 + 副標）
- [ ] Modal 元件（480–560px, rounded-xl, overlay）
- [ ] Data Table 元件（行高 48px, header neutral-100, hover）
- [ ] Loading Spinner / Skeleton
- [ ] Toast / Alert 通知

---

## Phase 2：前台公開頁面 (Frontend)

### 2.1 首頁 `/`
- [ ] Hero Section（Split 3/5:2/5 + Eyebrow + CTA）
- [ ] 點名橫幅（條件顯示：登入 + 有進行中事件）
- [ ] 組織簡介 Section（使命文字 + 四大職能 Cards）
- [ ] 最新消息預覽 Section（3 欄 News Cards）
- [ ] 活動回顧預覽 Section（不對稱版型：1 Featured + 2 Small）
- [ ] RWD 響應式適配（Mobile-first）

### 2.2 關於我們 `/about`
- [ ] Markdown 渲染頁面
- [ ] Eyebrow + 長文本排版
- [ ] CMS 內容讀取（Firestore `site_content`）

### 2.3 組織章程 `/charter`
- [ ] Markdown 渲染 + 錨點導航
- [ ] 側邊欄目錄（TOC）
- [ ] CMS 內容讀取

### 2.4 幹部成員 `/members`
- [ ] 成員架構可視化 / 卡片清單
- [ ] CMS 內容讀取

### 2.5 最新消息 `/news`
- [ ] 消息列表頁（分頁 + 分類篩選）
- [ ] 單篇消息頁 `/news/[slug]`（Markdown 全文）
- [ ] OG 標籤 + SEO Metadata
- [ ] ISR 靜態頁面生成

### 2.6 活動回顧 `/activities`
- [ ] 活動列表頁（分頁）
- [ ] 單篇活動頁 `/activities/[slug]`
- [ ] OG 標籤 + SEO Metadata
- [ ] ISR 靜態頁面生成

### 2.7 公開表單 `/forms/[form_id]`
- [ ] 表單 Schema 動態渲染
- [ ] 條件邏輯（depends_on）
- [ ] 預填值（default_from_user）
- [ ] 提交驗證 + 防重複
- [ ] ISR 靜態頁面

### 2.8 SEO
- [ ] 每頁 title / description / og:image 設定
- [ ] `/sitemap.xml` 生成
- [ ] `/robots.txt`
- [ ] Canonical URL

---

## Phase 3：後台管理系統 (Admin)

### 3.1 Dashboard `/admin`
- [ ] 4 欄統計卡片（社團數 / 開放表單 / 待繳保證金 / 點名出席率）
- [ ] 最近 5 筆表單回覆 Widget
- [ ] 待繳保證金清單 Widget

### 3.2 網站內容管理 `/admin/content`
- [ ] Markdown 編輯器（Milkdown 或 TipTap）
- [ ] 各頁面內容管理（site_content collection）
- [ ] 圖片上傳整合（Firebase Storage）
- [ ] 儲存並發布 + ISR 觸發

### 3.3 文章管理 `/admin/posts`
- [ ] 文章 CRUD（新增 / 編輯 / 刪除）
- [ ] 狀態切換（draft ↔ published）
- [ ] 封面圖上傳
- [ ] Markdown 編輯器
- [ ] 標籤管理

### 3.4 表單管理 `/admin/forms`
- [ ] 表單列表（狀態篩選 + 搜尋）
- [ ] 新增表單（JSON Schema 編輯器）
- [ ] 表單欄位拖曳排序
- [ ] 條件邏輯設定 UI
- [ ] 表單模板（社博 / 寒假場協 / 一般報名 / 出席調查）
- [ ] 回覆管理 `/admin/forms/[form_id]/responses`
- [ ] 回覆匯出 CSV

### 3.5 保證金管理 `/admin/deposit`
- [ ] 保證金列表（狀態篩選 + 搜尋）
- [ ] 狀態機操作（pending → paid → returned）
- [ ] 批次操作 Toolbar
- [ ] CSV 匯出
- [ ] 視覺指示（紅/綠/灰 accent）

### 3.6 點名管理 `/admin/attendance`
- [ ] 點名事件列表（Cards Grid）
- [ ] 新增點名事件
- [ ] 事件詳頁（即時出席統計 + 出席列表）
- [ ] 手動補點名 Modal
- [ ] CSV 匯出

### 3.7 社團名單管理 `/admin/clubs`
- [ ] 社團列表（分類篩選 + 搜尋 + 分頁）
- [ ] YAML / JSON 匯入流程 Modal（4 步驟）
- [ ] 預覽差異（新增 / 更新 / 無變動）
- [ ] Firestore 批次寫入
- [ ] CSV 匯出

### 3.8 用戶管理 `/admin/users`
- [ ] 用戶列表
- [ ] 角色指派（admin / club_member）
- [ ] 關聯社團設定

---

## Phase 4：API Routes & Cloud Functions

### 4.1 API Routes
- [ ] `/api/revalidate` — ISR On-demand Revalidation
- [ ] `/api/auth/session` — Session Cookie 管理
- [ ] `/api/forms/[form_id]/submit` — 表單提交（含防重複 Transaction）
- [ ] `/api/attendance/checkin` — 點名提交（含防重複 Transaction）
- [ ] `/api/clubs/import` — 社團 YAML/JSON 匯入
- [ ] `/api/export/csv` — CSV 匯出通用接口

### 4.2 Cloud Functions
- [ ] 表單提交後自動建立 deposit_record
- [ ] 表單統計計數更新
- [ ] ISR 觸發 Webhook

### 4.3 Firestore Security Rules
- [ ] 全路徑 deny-by-default
- [ ] admin RBAC 驗證
- [ ] 表單回覆 create-only
- [ ] 點名 uid 一致性驗證
- [ ] 複合索引設定

---

## Phase 5：SEO 優化與上線準備

- [ ] 效能優化（Firestore 索引、ISR revalidate 間隔）
- [ ] Lighthouse 審查（Performance / Accessibility / SEO）
- [ ] 安全性審查（XSS / CSRF / Token 保護）
- [ ] Vercel 部署設定
- [ ] 環境變數設定（Production / Preview / Development）
- [ ] Firebase Emulator 本地開發設定
- [ ] 最終測試

---

## 當前進度

| Phase | 狀態 | 說明 |
|---|---|---|
| Phase 1 | 🔄 進行中 | 基礎設施建立 |
| Phase 2 | ⏳ 待開始 | 前台頁面 |
| Phase 3 | ⏳ 待開始 | 後台系統 |
| Phase 4 | ⏳ 待開始 | API & Functions |
| Phase 5 | ⏳ 待開始 | 優化與上線 |
