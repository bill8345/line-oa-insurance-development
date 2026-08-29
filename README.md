# 💰 WealthBlueprint — LINE OA 退休財務規劃（前端）

<p align="center">
  <img src="https://img.shields.io/badge/LIFF-00C300?style=for-the-badge&logo=line&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white" />
</p>

## 📌 專案簡介

本專案為 **WealthBlueprint** 的前端 LIFF (LINE Front-end Framework) 應用，嵌入於 LINE 聊天室中，提供使用者互動式的退休金缺口試算表單與理財人格測驗。

> 🔗 後端 API：[line-oa-backend-api](https://github.com/bill8345/line-oa-backend-api)

---

## 🎯 功能特色

- 📝 **第一階段：退休金試算表單** — 輸入年齡、花費、存款，即時計算資金缺口
- 📈 **互動式折線圖** — 使用 Chart.js 在線繪製存款 vs 需求趨勢圖
- 🧠 **第二階段：理財人格測驗** — 依資產配置偏好分為積極型 / 穩健型 / 保守型
- 🎨 **專屬風格圖卡** — 根據測驗結果顯示對應風格的視覺圖片
- 📲 **LINE 深度整合** — 自動取得使用者 LINE 暱稱，結果推播回聊天室

---

## 📂 專案結構

```
frontend/
├── index.html          # LIFF 主頁面（表單 + 結果 + 人格測驗）
├── app.js              # LIFF 核心邏輯（LIFF 初始化、API 呼叫、圖表渲染）
├── index_v2.html       # LIFF 精簡版（僅缺口試算，壽命 90 歲 / 利率 1.7%）
├── app_v2.js           # 精簡版邏輯
├── web.html            # QR code 網頁版入口（不經 LINE，見下方說明）
├── web.js              # 網頁版邏輯（前端試算 + 到期檢查）
├── style.css           # 樣式設計（三個頁面共用）
└── images/
    ├── aggressive.jpg   # 積極型人格圖卡
    ├── robust.jpg       # 穩健型人格圖卡
    └── conservative.jpg # 保守型人格圖卡
```

> ⚠️ `style.css` 由所有頁面共用，修改時會同時影響 LIFF 版與網頁版。

---

## 📱 QR code 網頁版入口（`web.html`）

供實體場合掃描使用的獨立入口，**不經過 LINE**，與 LIFF 版並存互不影響。

**網址**：https://bill8345.github.io/line-oa-insurance-development/web.html

### 與 LIFF 版的差異

| 項目 | LIFF 版 (`index.html`) | 網頁版 (`web.html`) |
|------|------|------|
| 進入方式 | LINE 聊天室內開啟 | 掃 QR code，任何瀏覽器 |
| LIFF SDK | 載入 | 不載入 |
| 試算執行位置 | 後端 `/api/calculate` | **前端 JS**（`calculateRetirementPlan()`） |
| 結果推播回 LINE | ✅ Flex Message + QuickChart 圖 | ❌ 只顯示在網頁上 |
| Google Sheets 紀錄 | ✅ | ❌ |
| 有效期限 | 無 | ✅ 到期後顯示失效畫面 |

試算改在前端執行的原因：後端部署在 Render 免費方案會休眠，冷啟動約 50 秒。掃 QR 的使用者不該等這麼久，因此把 `backend/calculator.py` 的邏輯改寫成同一套 JS（通膨 3%、存款利率 1.5%、活到 100 歲），數值與後端逐欄位一致。

### 到期設定

到期時間寫在 `web.js` 第一段常數：

```js
const EXPIRE_AT = new Date('2026-09-05T23:59:59+08:00');
```

- 過期後整頁改顯示「此連結已失效」，不顯示表單
- **要延期只需改這行日期並重新 push，QR code 不用重印**
- 到期判斷讀取的是使用者裝置時間，屬於前端檢查，能擋一般使用者但無法防止刻意繞過

### 產生 QR code

QR 產生腳本 `make_qr.py` 放在**專案根目錄**（不在本 repo 內），使用 `segno` 純本機產生，不經任何第三方服務：

```bash
pip install segno
python3 make_qr.py     # 產出 retirement_qr.png
```

---

## 🔧 技術棧

| 技術 | 用途 |
|------|------|
| **LIFF SDK** | LINE 內嵌前端框架，取得使用者資訊 |
| **Vanilla JS** | 表單處理、API 呼叫、條件運算 |
| **Chart.js** | 動態折線圖繪製 |
| **CSS3** | 漸層背景、微動畫、響應式設計 |
| **GitHub Pages** | 靜態頁面部署 |

---

## 🚀 部署方式

本專案使用 GitHub Pages 自動部署，推送至 `main` 分支即可上線（約 30–60 秒生效）。

LIFF URL 設定於 [LINE Developers Console](https://developers.line.biz/)，指向本 Repo 的 GitHub Pages 網址（`index.html`）。

`web.html` 為獨立靜態頁面，不需要任何後端或平台設定，push 後即可掃描使用。

---

## 📎 相關 Repo

| Repo | 說明 |
|------|------|
| **[line-oa-backend-api](https://github.com/bill8345/line-oa-backend-api)** | 後端 FastAPI |
| **[line-oa-insurance-development](https://github.com/bill8345/line-oa-insurance-development)** | 前端 LIFF 頁面（本 Repo） |

---

## 📄 License

MIT License
