# VerityRead → Cursor 交接

- **交接日期：** 2026-07-26
- **本機倉庫：** `/Users/craighsieh/Documents/VaultLens`
- **GitHub：** `https://github.com/Craighsieh/VerityRead`
- **正式名稱：** VerityRead／真閱
- **目前階段：** 0.1.0 已提交 Chrome Web Store，等待審查
- **技術棧：** TypeScript、Vite、CRXJS、React、Manifest V3、pnpm

---

## 1. Cursor 開工指令

```text
你正在接手 VerityRead（真閱），一個隱私優先的 Chrome MV3 本機 AI 閱讀助理。

倉庫：/Users/craighsieh/Documents/VaultLens

開始前依序完整閱讀：
1. VerityRead_Local_AI_Browser_PRD_v1.0.md
2. docs/HANDOFF_CURSOR.md
3. docs/RELEASE_READINESS.md
4. docs/ARCHITECTURE.md
5. docs/THREAT_MODEL.md
6. docs/PRIVACY_TEST_PLAN.md
7. docs/adr/ADR-001 至 ADR-006

先同步 main，再執行：
pnpm install
pnpm pipeline
pnpm test:e2e
pnpm test:egress

0.1.0 正在 Chrome Web Store 審查。未經使用者要求，不要撤回、取代或修改
待審版本，也不要先做版本升級。
```

---

## 2. 不可破壞的產品與安全邊界

- 禁止雲端推理 fallback。
- 網頁正文、選取文字、Prompt、回覆、頁面 URL 與標題不得傳給發布者或
  第三方推理／分析服務。
- 頁面讀取必須由使用者明確觸發。
- 不加入 `<all_urls>`；一般網站持續權限只能逐一要求精確 origin。
- Ollama 僅使用 `http://127.0.0.1:11434`。0.1.0 拒絕 `localhost`、
  區網位址、自訂連接埠及遠端 endpoint。
- 不遠端載入或執行 JavaScript、WASM。
- 不把 API key、密碼或憑證寫入程式碼、文件、測試 fixture 或 Git history。
- 不編輯 `*.plan.md`。
- 目前不做 WebGPU、PDF、多文件 RAG、付費授權、Edge／Firefox 或 LM Studio。

---

## 3. 已合併的發布工作

| PR | 狀態 | 內容 |
| --- | --- | --- |
| [#1](https://github.com/Craighsieh/VerityRead/pull/1) | 已合併 | 0.1.0 release candidate、隱私／權限修復、商店素材 |
| [#2](https://github.com/Craighsieh/VerityRead/pull/2) | 已合併 | 五語 Ollama 設定指南 |
| [#3](https://github.com/Craighsieh/VerityRead/pull/3) | 已合併 | 五語公開支援頁面 |
| [#4](https://github.com/Craighsieh/VerityRead/pull/4) | 已合併 | Chrome Stable 冷啟動 context-menu 修復 |

GitHub Pages 已由 `/docs` 發布：

- 首頁：<https://craighsieh.github.io/VerityRead/>
- 隱私政策：<https://craighsieh.github.io/VerityRead/privacy/>
- Ollama 設定：<https://craighsieh.github.io/VerityRead/setup/>
- 支援：<https://craighsieh.github.io/VerityRead/support/>

公開頁面與 GitHub repository 的自願支持入口使用
<https://paypal.me/craighsieh>。此連結由 PayPal 處理付款，不進入擴充功能
runtime、不解鎖功能，也沒有加入 0.1.0 待審套件。若後續更換收款目的地，需同步
更新 `.github/FUNDING.yml`、`README.md`、`docs/index.md`、五語支援頁面及共用
QR Code，並先以登出狀態確認公開收款人資訊。

---

## 4. Chrome Web Store 狀態

- Item ID：`ocpdemeggjodckegncmndokciofklfde`
- 版本：`0.1.0`
- 提交日期：2026-07-26
- 目前狀態：`待審查`（pending review）
- 分發：免費、公開、所有地區
- 審查通過後：自動發布
- 分類：Productivity → Tools
- 商店語言：英文、繁體中文、簡體中文、日文、韓文
- 每個語言有兩張本地化 1280×800 截圖
- 無帳號、付款、廣告、分析 SDK 或發布者管理的推理服務

上傳檔案：

- `release/verityread-0.1.0.zip`
- SHA-256：
  `b9b131adb1d8b92eeb6cb554a6810bcd5d345e5a065f029d7e1616770f77cd78`

Chrome 現行資料揭露表單沒有獨立的「User-generated content」選項，因此
Dashboard 選取 `Website content` 與 `Web history`。Prompt 與本機答案的處理
仍由公開隱私政策及審查操作說明涵蓋。後續修改揭露時必須保持一致。

---

## 5. 已驗證的 0.1.0 證據

- `pnpm pipeline`：lint、typecheck、66 項 Vitest、production build、
  `scan:dist` 全部通過。
- `pnpm test:e2e`：8 項 Playwright 測試通過，包含 production
  extension bundle 載入。
- `pnpm test:egress`：通過。
- Chrome Stable：toolbar 啟動、摘要、頁面提問、來源回跳、選取翻譯、
  Stop、受保護頁面與權限恢復路徑已驗收。
- Ollama：loopback `/api/tags`、精確 extension-origin CORS 與產品內連線
  路徑已驗證。
- 日／韓公開文案已使用 Anthropic API 輔助檢查；結果在
  `docs/qa/anthropic-ja-ko.json`。沒有 API key 被提交。

---

## 6. 審查期間的優先順序

1. 不要修改待審查版本，先監看 Chrome Web Store 狀態與審查郵件。
2. 若審查通過：
   - 確認公開商店頁可存取。
   - 從商店全新安裝 0.1.0。
   - 重跑核心任務與隱私冒煙測試。
   - 將公開商店連結及批准日期補入 `README.md`、
     `docs/index.md`、`docs/RELEASE_READINESS.md`。
3. 若要求補件但不需新 ZIP：
   - 只修改 Dashboard 說明或素材。
   - 保持與 `docs/store/` 及 `docs/privacy/` 一致。
4. 若遭退回或必須上傳新 ZIP：
   - 先保存完整退回理由與 policy ID。
   - 從最新 `main` 開新分支，做最小修復。
   - 只有在確定需要新 package 時才更新 manifest／package 版本。
   - 重跑完整 release gate，產生新 ZIP 與 SHA-256，再更新文件。

---

## 7. 審查後的產品工作

商店審查和工程品質不是同一個 gate。0.1.0 核心工程門檻已通過，但以下仍是
後續產品驗證：

- 10–20 名封閉測試者。
- 首次設定成功率、核心任務成功率及隱私理解度。
- 第二台 Windows 11／16 GB 基準裝置。
- crash-free sessions、擷取成功率與不同模型效能。
- 日／韓母語者最終文案驗收；Anthropic API QA 只能作輔助證據。

---

## 8. 常用命令

```bash
git fetch --prune --tags origin
git switch main
git pull --ff-only origin main
pnpm install
pnpm pipeline
pnpm test:e2e
pnpm test:egress
pnpm build
pnpm scan:dist
shasum -a 256 release/verityread-0.1.0.zip
```

Git 操作前先檢查 `git status -sb`，不要覆蓋不屬於目前工作的使用者修改。

---

## 9. 關鍵入口

| 工作 | 先看 |
| --- | --- |
| 發布／審查 | `docs/RELEASE_READINESS.md`、`docs/store/` |
| Ollama／CORS | `src/providers/ollama.ts`、`docs/setup/` |
| Chrome Built-in AI | `src/providers/chromeBuiltin.ts` |
| 摘要／提問 | `src/core/orchestrator.ts`、`src/sidepanel/components/ChatPanel.tsx` |
| 頁面擷取／回跳 | `src/core/extract.ts`、`src/content/index.ts` |
| 權限／冷啟動 | `src/background/index.ts`、`src/background/contentScriptReady.ts` |
| 多語系 | `src/i18n/`、`public/_locales/` |
| 隱私／離線鎖定 | `src/core/offlineLock.ts`、`PrivacyCenter.tsx` |
| 自動化驗證 | `tests/`、`scripts/scan-dist.ts` |

---

**交接完成標準：** Cursor 能從最新 `main` 重現綠色測試、清楚區分
「待審查」與「已上架」，並在不破壞本機推理與最小權限邊界的情況下處理
Chrome Web Store 後續。
