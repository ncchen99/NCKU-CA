# Firestore Security Rules 回歸測試

針對 `firebase/firestore.rules` 的使用者、後台資料與點名紀錄權限做自動化驗證，
防止自行提權、草稿／點名密碼外洩，以及繞過點名 API 直接寫入。

## 需求

- Node.js 20+
- Java 11+（Firestore 模擬器需要）
- Firebase CLI（`npm i -g firebase-tools`）

## 執行

```bash
cd firebase/tests
npm install
npm test
```

測試會用 `@firebase/rules-unit-testing` 啟動 Firestore 模擬器，
載入 `../firestore.rules`，並以「已登入的一般學生」身分實際發出讀寫請求。

## 測試涵蓋範圍

**提權 / 越權（必須被拒絕）**

| 編號 | 情境 |
| --- | --- |
| EXPLOIT-1 | 學生建立自己的 `users` 文件並塞 `role: "admin"` |
| EXPLOIT-2 | 學生 create 時夾帶白名單外的欄位 |
| EXPLOIT-3 | 學生 create 時綁不存在／停用的 `club_id` |
| EXPLOIT-4 | 學生 update 自己的 `role` |
| EXPLOIT-5 | 學生讀取他人的 `users` 文件 |
| EXPLOIT-6 | 學生 update 時綁不存在的社團 |
| EXPLOIT-7 | 文件不存在時搶先 create 提權 |
| EXPLOIT-8 | 學生替他人建立 `users` 文件 |

**正常流程（不可被誤殺）**

| 編號 | 情境 |
| --- | --- |
| OK-1 | 首次登入建立自己的 `users` 文件（`role: club_member`） |
| OK-2 | 更新 `display_name` |
| OK-3 | `club_id` 留空（尚未選社） |
| OK-4 | `club_id` 設為 `none`（明確無社團） |
| OK-5 | 讀取自己的 `users` 文件 |
| OK-6 | 把 `club_id` 從社團改回 `none` |
| OK-7 | 把 `club_id` 改成其他啟用中的社團 |

**後台資料與點名**

| 類型 | 情境 |
| --- | --- |
| 防護 | 匿名／一般學生不可讀取草稿表單與點名事件 |
| 防護 | 已降權但仍持有舊 admin claim 的使用者不可讀取後台資料 |
| 防護 | 一般學生不可直接建立點名紀錄 |
| 正常 | 匿名可讀開放表單、學生可讀已關閉表單 |
| 正常 | 管理員可讀草稿與點名事件、學生可讀自己的點名紀錄 |
