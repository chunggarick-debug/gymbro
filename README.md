# 💪 GymBro.AI

一個「記錄只要幾秒、AI 依數據動態給建議、靠遊戲化讓你每天想回來」的健身＋飲食記錄 App。

**v1 特點**
- 🥗 飲食記錄極致省力：常用清單一鍵點、🎤 語音（粵語）、📷 拍照 AI 辨識（Gemini）、手動搜尋
- 🏋️ 重訓記錄：課表模板一鍵套用、自動帶入上次重量、休息計時器
- 🎮 遊戲化：連續打卡 🔥、成果比較 📊、每週挑戰 🎯、成就徽章 🏅、經驗等級
- 🤖 AI 教練：依你的真實數據動態調整課表與飲食建議
- 📈 進展視覺化：力量曲線、PR 追蹤、近 7 天熱量／蛋白質圖表
- 🔒 資料只存你這個瀏覽器（localStorage），不需帳號

## 啟動方法

**方法一（推薦）：雙擊 `start.bat`**
- 需要已安裝 [Node.js](https://nodejs.org)（或有 Python）
- 啟動後用瀏覽器開啟它顯示的網址（通常是 http://localhost:8000）

**方法二：手動啟動**
```bash
node server.js
# 或
python -m http.server 8000
```

**方法三：直接開啟 `index.html`**
- 基本功能可用，但拍照、語音需要透過 localhost 伺服器（瀏覽器安全限制）。

## 加到手機主畫面（像 App 一樣）
1. 用**同一 Wi-Fi** 的手機瀏覽器開啟電腦的 IP，例如 `http://192.168.x.x:8000`（用 `ipconfig` 查電腦 IP）
2. iPhone Safari → 分享 → 「加到主畫面」
3. Android Chrome → 選單 → 「安裝應用程式」

> 拍照／語音功能在 `localhost` 或 `https` 下才能用；純 http 區域網路 IP 也可用「加到主畫面」，但拍照可能要改用手機相機後再上傳。

## 拍照 AI 辨識設定（可選 DeepSeek 或 Gemini）
- **DeepSeek（推薦，價格便宜）**：到 [DeepSeek 開放平台](https://platform.deepseek.com/) 申請 API Key（`sk-` 開頭），選「DeepSeek」服務
- **Google Gemini（有免費額度）**：到 [Google AI Studio](https://aistudio.google.com/) 申請 API Key（`AIza` 開頭），選「Gemini」服務

步驟：App 內「設定」→ 選 AI 服務 → 貼上 Key → 儲存 → 回「今天」→「📷 拍照記錄」即可辨識香港食物與估算熱量。

## 用手機開啟
1. 手機與電腦連上**同一網絡**（或手機能上網即可，若電腦有公網 IP）
2. 手機瀏覽器開啟 `http://<電腦IP>:8000`（電腦 IP 可用 `ipconfig` 查）
3. iPhone Safari → 分享 →「加到主畫面」；Android Chrome → 選單 →「安裝應用程式」

> 注意：純 `http`（非 localhost）下，語音（麥克風）可能被瀏覽器限制；拍照辨識用系統相機、手動記錄皆正常。若要語音也正常，需要 HTTPS（可配合 Cloudflare Tunnel 等工具）。

## 資料備份
「設定」→「匯出備份」會下載 JSON；換裝置可用「匯入備份」還原。

## 技術
純前端 PWA（HTML/CSS/JavaScript ES Modules，無建置步驟、無框架依賴）。資料存 localStorage，拍照辨識用 Gemini Vision API，語音用 Web Speech API。
