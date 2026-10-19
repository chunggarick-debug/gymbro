# 部署 GymBro.AI 到 GitHub Pages（免費，自動有 HTTPS）

部署後會得到一個 `https://你的帳號.github.io/gymbro/` 網址，手機、電腦都能開，**語音功能也因為有 HTTPS 而能正常使用**。

## 第一次部署（約 5 分鐘，全程網頁操作）

### 1. 註冊 GitHub 帳號
- 到 https://github.com 按「Sign up」註冊（免費）。

### 2. 建立新儲存庫（repo）
1. 登入後，點右上角「**+**」→「**New repository**」
2. **Repository name** 填：`gymbro`
3. 選 **Public**（免費方案要 Public 才能用 Pages）
4. **不要**勾選 README / .gitignore / license（保持空白）
5. 按「**Create repository**」

### 3. 上傳檔案
1. 建立後頁面會出現「Quick setup」，點下方的「**uploading an existing file**」連結
2. 打開檔案總管，到 `E:\GymBro.AI`，**把整個資料夾內容拖進去**（或全選所有檔案拖入）
3. 等上傳完成，按「**Commit changes**」

> 拖進去時要包含：`index.html`、`css/`、`js/`、`icons/`、`manifest.json`、`sw.js`、`.nojekyll` 等（.nojekyll 很重要，別漏掉）。

### 4. 開啟 Pages
1. 在 repo 頁面點「**Settings**」（頁面頂部）
2. 左側選單點「**Pages**」
3. 「Source」選「**Deploy from a branch**」
4. Branch 選「**main**」，資料夾選「**/ (root)**」，按「**Save**」
5. 等 1～2 分鐘，頁面頂端會顯示網址：`https://你的帳號.github.io/gymbro/`

### 5. 完成 🎉
用手機或電腦開那個網址即可使用。

## 之後更新（改程式後想更新線上的版本）
回到 repo 頁面 → 點「Add file」→「Upload files」→ 重新拖入更新過的檔案 → Commit。或用 GitHub Desktop / git 更方便（進階）。

## 注意事項
- **資料**：每個裝置/瀏覽器的資料是分開的（存在各自的瀏覽器），不會上傳到 GitHub，也不會同步。
- **API Key**：每個裝置都要在「設定」填一次自己的 DeepSeek / Gemini Key；Key 只存在該瀏覽器，不會進到 GitHub 倉庫（不會外洩）。
