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
├── index.html          # 主頁面（表單 + 結果 + 人格測驗）
├── app.js              # 核心邏輯（LIFF 初始化、API 呼叫、圖表渲染）
├── style.css           # 樣式設計（漸層、動畫、響應式）
└── images/
    ├── aggressive.jpg   # 積極型人格圖卡
    ├── robust.jpg       # 穩健型人格圖卡
    └── conservative.jpg # 保守型人格圖卡
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

本專案使用 GitHub Pages 自動部署，推送至 `main` 分支即可上線。

LIFF URL 設定於 [LINE Developers Console](https://developers.line.biz/)，指向本 Repo 的 GitHub Pages 網址。

---

## 📎 相關 Repo

| Repo | 說明 |
|------|------|
| **[line-oa-backend-api](https://github.com/bill8345/line-oa-backend-api)** | 後端 FastAPI |
| **[line-oa-insurance-development](https://github.com/bill8345/line-oa-insurance-development)** | 前端 LIFF 頁面（本 Repo） |

---

## 📄 License

MIT License
