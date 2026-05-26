# Email 通知功能需求書

**狀態**：待實作（暫緩，待 SendGrid 或替代方案的方案確定後再啟動）
**建立日期**：2026-05-26
**負責範圍**：表單管理員手動觸發的群發通知，以及使用者端的訂閱／取消訂閱流程

---

## 1. 背景與動機

社聯會經常開啟新的活動報名表單，目前缺乏主動通知所有使用者的機制；管理員只能仰賴公告或私訊。本功能讓管理員在後台「表單管理」頁面以一鍵將特定表單的報名連結寄送給已訂閱通知的使用者。

> ⚠️ **目前阻塞點**：Twilio SendGrid 免費方案的每日寄送上限（100 封）不足以涵蓋預期收件人數量，且暫無 API Key。本文件先凍結需求與設計，待選定服務商後再進入實作。

---

## 2. 服務商評估（候選）

| 服務商 | 免費額度 | 備註 |
| --- | --- | --- |
| Twilio SendGrid | 100/day | 原規劃，但額度不足 |
| Resend | 100/day, 3000/month | API 簡潔，但同樣有上限 |
| Amazon SES | 出帳即用，量大便宜 | 需驗證網域與沙盒解除 |
| Mailgun | 5000 / 前 3 月 | 之後付費 |
| Brevo（前 Sendinblue） | 300/day | 對校園社團可能足夠 |

> 實作前需先決定服務商，並準備好 API Key、寄件網域驗證（SPF / DKIM）、退信處理流程。

---

## 3. 功能範圍

### 3.1 後台：表單管理「Email」按鈕

- 位置：[src/app/admin/forms/page.tsx](../web/src/app/admin/forms/page.tsx) 表格 `actions` 欄位內，**置於「檢視」按鈕左側**。
- Icon：`@heroicons/react/24/outline` 的 `EnvelopeIcon`。
- 互動：
  1. 點擊按鈕 → 跳出 `ConfirmDialog`：「確認要發送郵件嗎？」副標應顯示「將寄給所有已訂閱通知的使用者（預估 N 人）」。
  2. 點「確認」→ 呼叫後端 API `POST /api/admin/forms/[formId]/send-email`。
  3. 寄送中按鈕 disabled、顯示 loading。
  4. 成功 → toast「已寄出 N 封通知」；失敗 → toast 顯示錯誤；若服務未配置（無 API Key）→ toast「Email 服務尚未設定，已略過」。

### 3.2 後端 API：寄送通知

- 路由：`POST /api/admin/forms/[formId]/send-email`
- 權限：須通過既有 admin auth middleware。
- 流程：
  1. 取得 `Form` 文件，若 `status !== "open"` 應拒絕寄送（避免寄出已關閉的表單）。
  2. 查詢 users collection 中 `notify_subscribed !== false`（undefined 視為 true）且 `email` 有值者。
  3. 組合郵件內容（見 §3.5）。
  4. 呼叫 Email service helper 寄送（建議使用 SDK 的 `sendMultiple` 或 personalization，使每位收件人的取消訂閱連結帶上獨立 token）。
  5. 回傳 `{ sent: number, skipped: number, failures: Array<{email, reason}> }`。
- 容錯：若 `EMAIL_API_KEY` 未設定 → 回傳 `200 { skipped: true, reason: "EMAIL_PROVIDER_NOT_CONFIGURED" }`，**不要 throw**，讓使用者拿到 key 後直接 set env 就能用。

### 3.3 使用者訂閱欄位（Firestore schema）

於 `User` 介面新增：

```ts
/** 是否訂閱表單通知 Email。undefined 視為 true（既有帳號預設開啟） */
notify_subscribed?: boolean;
```

- **不做** 一次性 migration 寫入既有帳號；讀取端以 `notify_subscribed !== false` 判斷。
- 寫入端（個人設定）若使用者取消勾選，明確寫 `false`；若重新勾選，可寫 `true`（或刪除欄位）。

### 3.4 前台：個人設定的訂閱開關

- 位置：[src/app/profile/page.tsx](../web/src/app/profile/page.tsx)。
- 在現有欄位（姓名、社團、職位、系級）下方加一個 toggle / checkbox：「接收社聯會 Email 通知」。
- 預設值依後端讀取，undefined → true。
- 儲存：併入既有 `saveProfileUser` 流程，新增 `notifySubscribed` 參數透傳到 Firestore。
- **聚焦行為**：若網址帶 `?focus=notify`，頁面載入後：
  1. 將 toggle 元素 `scrollIntoView({ block: "center" })`。
  2. `focus()` 至該 input。
  3. 加上 2 秒的 ring highlight 樣式提醒使用者目標位置。
- **預填取消**：若網址同時帶 `unsubToken=xxx`，伺服端（或 server component）驗證 token 後預設 toggle 為「未勾選」並顯示提示橫幅「您正在取消訂閱，按下儲存即生效」。使用者按儲存前不會真的退訂（避免誤觸）。

### 3.5 郵件內容

- 寄件者：`社聯會 <noreply@<domain>>`（網域需經 DKIM/SPF 驗證）
- 主旨：`【社聯會】新表單開放：{form.title}`
- HTML 內容大綱：
  - 開場：「最近社聯會開啟了新的表單。」
  - 表單標題（H2）
  - `form.description`（純文字段落）
  - CTA 按鈕：「前往報名」→ 連結 `{NEXT_PUBLIC_SITE_URL}/forms/{formId}`
  - 截止時間：若 `closes_at` 存在則顯示
  - Footer：
    - 「您之所以收到這封信，是因為您在社聯會平台啟用了通知。」
    - **取消訂閱**連結：`{NEXT_PUBLIC_SITE_URL}/profile?focus=notify&unsubToken={token}`
- 文字版（plain text fallback）同步提供。

### 3.6 取消訂閱 token

- 機制：HMAC-SHA256(uid, secret=`UNSUBSCRIBE_SECRET`) → base64url。
- 驗證：profile 頁載入時若帶 `unsubToken` 與目前登入 uid 不符或驗證失敗 → 忽略 token、不影響操作。
- 不需要新 collection、不需要逾期機制（HMAC 不可逆即可）。

---

## 4. 環境變數

| 變數 | 用途 |
| --- | --- |
| `EMAIL_API_KEY` | 服務商 API Key |
| `EMAIL_FROM_ADDRESS` | 寄件地址（須通過網域驗證） |
| `EMAIL_FROM_NAME` | 寄件者顯示名稱 |
| `UNSUBSCRIBE_SECRET` | HMAC 簽章用 secret |
| `NEXT_PUBLIC_SITE_URL` | 組裝郵件內連結 |

---

## 5. 待確認事項

1. **服務商與預算**：是否願意付費？預估每月寄送量？
2. **收件人範圍**：是否限制只寄給「表單目標社團」的使用者？（目前設計為全體訂閱者）
3. **頻率限制**：同一張表單可被重複寄送嗎？要不要記錄上次寄送時間以避免誤觸？
4. **退信／黑名單**：硬退信（hard bounce）是否自動將 `notify_subscribed` 設為 false？
5. **管理員自己**：是否需要在收件清單中排除觸發寄送的管理員？

---

## 6. 不在本次範圍

- 點名通知、留言通知等其他類型的 Email。
- 排程／自動寄送（例如表單即將截止前 24 小時）。
- 站內通知中心。

以上若日後需要，另開規格文件。
