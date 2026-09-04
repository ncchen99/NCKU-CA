# 表單回歸測試

在 `web/` 執行，使用 Node.js 與 tsx：

```sh
npx tsx --test tests/form-response-validation.test.ts
FIRESTORE_EMULATOR_HOST=127.0.0.1:8099 npx tsx --test tests/form-response-transactions.test.ts tests/form-club-ids.test.ts
```

交易測試需要已啟動的本機 Firestore Emulator；只接受 localhost／127.0.0.1。
使用 `ncku-ca-rulestest`、臨時產生的假憑證與 UUID 資料，結束後清除自己建立的文件。
不要載入 `.env`、真實服務帳戶或改接雲端資料庫。

- 欄位驗證：型別、必填、選項、條件欄位與自填組織。
- 交易：提交／修改、本人身分、截止與重複檢查，以及連動／獨立保證金。
- 社團 ID：拒絕前後斜線、巢狀路徑與其他含斜線的 ID；涵蓋主要／隱藏次要 picker、個資／既有回覆 fallback。
- 拒絕後不得新增或改動回覆與保證金；合法中文、字面 percent、全形斜線、空白修整與 `none` 行為保留。

這些是實際交易與函式測試，不包含 Google 登入、完整瀏覽器或雲端部署。
