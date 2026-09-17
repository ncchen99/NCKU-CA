# 表單回歸測試

在 `web/` 執行，使用 Node.js 與 tsx：

```sh
npx tsx --test tests/form-response-validation.test.ts
FIRESTORE_EMULATOR_HOST=127.0.0.1:8099 npx tsx --test tests/form-response-transactions.test.ts tests/form-club-ids.test.ts tests/form-hidden-answers.test.ts
```

交易測試需要已啟動的本機 Firestore Emulator；只接受 localhost／127.0.0.1。
使用 `ncku-ca-rulestest`、臨時產生的假憑證與 UUID 資料，結束後清除自己建立的文件。
不要載入 `.env`、真實服務帳戶或改接雲端資料庫。

- 欄位驗證：型別、必填、選項、自填組織，以及數字／字串形式的數字 pattern；未設定 pattern 的欄位保留原有數字檢查。
- 隱藏欄位：畫面與伺服器共用可見性判斷；隱藏答案不驗證、不儲存，也不決定社團歸屬。隱藏的控制欄位視為未回答；循環依賴的欄位全部隱藏。涵蓋顯示／隱藏分支、連鎖條件、欄位順序與重複清理結果一致。
- 交易：提交／修改、本人身分、截止與重複檢查，以及連動／獨立保證金。
- 舊名稱：沒有可見名稱欄位時，編輯其他答案會保留回覆與連動保證金各自的既有名稱；即使社團選擇題仍顯示，也能沿用原本 `none` 回覆的有效名稱。新提交、正式社團改選 `none`、清空可見名稱欄位仍須通過名稱檢查；切換正式社團仍會清除舊自填名稱。
- 社團 ID：拒絕前後斜線、巢狀路徑與其他含斜線的 ID；涵蓋主要／可見次要 picker、個資／既有回覆 fallback。隱藏 picker 的無效 ID 會丟棄，可見 picker 的相同 ID 仍會拒絕。
- 拒絕後不得新增或改動回覆與保證金；合法中文、字面 percent、全形斜線、空白修整與 `none` 行為保留。

這些是實際交易與函式測試，不包含 Google 登入、完整瀏覽器或雲端部署。
