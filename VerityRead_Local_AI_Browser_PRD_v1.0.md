# VerityRead／真閱 — Privacy-First Local AI Browser Assistant

> 產品需求文件（PRD）v1.0  
> 日期：2026-07-25  
> 正式名稱：VerityRead；中文名稱：真閱
> 目標平台：Chrome Desktop（第一階段）；Edge／Firefox 後續評估  
> 文件用途：可直接交給 Codex、Cursor、Claude Code 等開發工具進行技術規劃與實作

---

## 0. 本版決策摘要

本版相較原始構想做出以下關鍵調整：

1. **不再使用 PrivateMind AI 作為產品名稱**  
   正式英文名稱為 **VerityRead**，中文名稱為 **真閱**。公開上架前仍須完成商標、Chrome Web Store、網域及社群帳號查核。

2. **將產品承諾改為可驗證的描述**  
   不使用「100% 零網路」或「隱私 100%」等絕對說法，改為：
   > 預設不將網頁內容、選取文字、Prompt 或 AI 回覆傳送至雲端推理服務。

   模型下載、擴充功能更新及付費授權可能需要網路，但必須與頁面內容資料流完全隔離。

3. **MVP 聚焦三個核心工作**
   - 摘要目前頁面
   - 針對目前頁面提問，並回跳原文依據
   - 翻譯選取文字

   「搜尋引擎增強」、「自動內容過濾」、「跨歷史紀錄 RAG」暫不列入 MVP。

4. **第一版只支援 Chrome Desktop**
   Chrome Side Panel、Built-in AI API 與 Firefox Sidebar 的架構及相容性不同。MVP 不同時承諾 Chrome、Edge、Firefox，以降低開發與測試成本。

5. **Gemini Nano 不再以 `window.ai` 寫死**
   使用能力偵測與 Provider Adapter；優先支援 Chrome 的 `LanguageModel`、`Summarizer`、`Translator` 等 Built-in AI API，實際可用性須於執行時判斷。

6. **WebGPU 延後至 MVP 驗證後**
   WebGPU 模型會帶來模型檔案大小、首次下載、記憶體、WASM 打包、瀏覽器相容性及商店審核風險。MVP 先以 Chrome Built-in AI 與 Ollama 驗證需求，再加入 WebGPU fallback。

7. **不以 Ollama 連線作為主要付費牆**
   Ollama 使用者是最早期、最願意提供回饋的核心族群。免費版應允許基本 Ollama 使用；Pro 應販售多文件、RAG、自訂工作流、批次處理及進階控制能力。

---

## 1. 產品概述

### 1.1 產品定位

VerityRead（真閱）是一款以隱私為核心的桌面瀏覽器 AI 助手。它讓使用者直接在瀏覽器側邊欄中摘要網頁、詢問頁面內容及翻譯文字，並優先使用裝置上的模型或使用者自行管理的本機模型服務完成推理。

### 1.2 一句話價值主張

> 在不把工作內容交給雲端 AI 的前提下，快速讀懂、查問與翻譯目前頁面。

### 1.3 核心差異

VerityRead 不以「支援最多模型」作為主要競爭點，而以以下四項建立差異：

- **使用者主動授權**：只有在使用者點擊功能後，才讀取目前分頁。
- **可看見的本機路由**：每次任務清楚顯示使用中的 Provider、模型及資料去向。
- **可追溯答案**：頁面問答顯示支持答案的原文片段，並可點擊回到頁面位置。
- **隱私可驗證**：提供離線鎖定、網路目的地說明、零頁面內容遙測及可重現的外連測試。

### 1.4 產品假設

我們需要驗證的核心假設為：

> 對商務、開發與隱私敏感使用者而言，「頁面內容不傳雲端」及「答案能回到原文」足以讓他們改用獨立瀏覽器助手，而不是直接使用現有雲端 AI 側邊欄。

---

## 2. 問題定義

### 2.1 使用者問題

現有 AI 瀏覽器助手通常存在以下問題：

- 需要將整頁內容、選取文字或文件上傳至第三方服務。
- 使用者難以確認資料實際傳到哪個模型或端點。
- 擴充功能常要求 `<all_urls>`、瀏覽歷史或長期背景存取。
- 回覆可能沒有原文依據，使用者需重新搜尋內容。
- 以雲端 Token 或訂閱計價，重度使用成本不可控。
- 在公司內部文件、Email、財務資料與未公開專案頁面上，使用者無法放心使用。

### 2.2 不解決的問題

VerityRead 第一階段不處理：

- 自動操作網頁、下單、寄信或提交表單。
- 雲端模型 fallback。
- 團隊知識庫、多人協作或企業管理後台。
- 整個瀏覽歷史的自動擷取與索引。
- 取代防毒、廣告阻擋器或企業 DLP 工具。
- 對銀行、醫療或法律內容提供專業決策。

---

## 3. 目標使用者與工作需求

### 3.1 優先使用者

| 優先級 | 使用者 | 主要工作 | 主要阻礙 |
|---|---|---|---|
| P0 | 開發者與技術使用者 | 閱讀文件、GitHub Issue、Release Notes，詢問程式或規格內容 | 不想將私有程式與內部文件傳至雲端 |
| P0 | 商務與營運人員 | 摘要內部頁面、分析長文、翻譯客戶內容、起草回覆 | 工作內容具商業機密，且需要可追溯依據 |
| P1 | 研究與金融使用者 | 閱讀報告、比較資料、從長文提取結論 | 文件較長，模型容易忽略來源或產生幻覺 |
| P2 | 一般隱私敏感使用者 | 翻譯、解釋陌生概念、減少雲端 AI 使用 | 不熟悉本機模型安裝與硬體限制 |

### 3.2 Jobs to Be Done

1. 當我閱讀長篇網頁時，我想在不外傳內容的情況下快速了解重點。
2. 當我需要確認頁面中的某個資訊時，我想直接提問並看到支持答案的原文。
3. 當我看到不熟悉的語言時，我想立即翻譯選取內容，不必將文字送到外部翻譯服務。
4. 當我處理敏感內容時，我想明確知道使用了哪個模型、是否產生外部請求及資料是否被保存。
5. 當我的裝置不支援某項本機模型時，我想得到清楚的原因與可行替代方案，而不是只看到錯誤。

---

## 4. 產品原則

1. **使用者觸發後才讀取**  
   不在背景自動掃描所有分頁，不預先讀取 Gmail、銀行或內部系統內容。

2. **頁面資料與外部網路隔離**  
   頁面文字不得進入模型下載、授權、更新或錯誤回報請求。

3. **最小權限優先**  
   MVP 使用 `activeTab`、`scripting`、`storage`、`sidePanel`、必要的 context menu 權限；不預設要求 `<all_urls>`。

4. **本機不等於無限制**  
   清楚告知硬體、首次模型下載、記憶體與速度限制，不做「所有電腦都能即時運行」的承諾。

5. **來源優先於漂亮回答**  
   找不到頁面依據時，必須回答「目前頁面中找不到足夠資訊」，而不是補充模型自身知識。

6. **輸出由使用者決定**  
   AI 產生的回覆、翻譯或草稿一律由使用者複製或套用；MVP 不自動送出、發布或提交。

7. **失敗要可理解、可恢復**  
   模型不可用、內容過長、Ollama CORS 未設定或記憶體不足時，提供具體處理方式。

---

## 5. 版本範圍

### 5.1 P0 — MVP 必須完成

| 模組 | 功能 |
|---|---|
| Onboarding | 裝置能力檢查、Provider 選擇、模型下載狀態、Ollama 設定引導 |
| 頁面擷取 | 使用者點擊後擷取目前分頁的標題、URL、主要正文、標題階層與可回跳定位資訊 |
| 摘要 | 短摘要、條列重點、詳細大綱三種模式 |
| 問頁面 | 針對目前頁面提問，附 1–3 個支持答案的原文片段及回跳功能 |
| 選取翻譯 | 右鍵選單或快捷入口翻譯選取文字，提供複製 |
| Provider | Chrome Built-in AI、Ollama |
| 隱私中心 | 顯示資料路由、Provider、保存狀態、允許的網路目的地與清除資料 |
| 錯誤處理 | 不支援頁面、模型不可用、內容超長、Ollama 無法連線等可操作提示 |

### 5.2 P1 — 公開 Beta

- 本機 PDF 上傳與解析。
- 選取文字的解釋、改寫及 Email 草稿。
- 自訂 Prompt／快捷動作。
- 任務結果快取與選擇性本機歷史。
- WebGPU 小型模型 fallback。
- Markdown、純文字及 JSON 匯出。
- 鍵盤快捷鍵與基本無障礙支援。

### 5.3 P2 — 正式版後

- 多分頁比較與彙整。
- 多文件本機 RAG。
- 網站規則與語意內容過濾。
- 搜尋頁面增強。
- 本機 OpenAI-compatible endpoint，如 LM Studio、llama.cpp。
- Firefox／Edge 完整適配。
- 選擇性 E2EE 同步；未驗證需求前不開發。

---

## 6. 核心功能規格與驗收條件

### 6.1 Onboarding 與能力檢查

#### 需求

首次開啟時，系統應檢查：

- Chrome Built-in AI API 是否存在。
- `LanguageModel`、`Summarizer`、`Translator` 個別可用狀態。
- 模型為 available、downloadable、downloading 或 unavailable。
- Ollama `127.0.0.1:11434` 是否可連線。
- WebGPU 是否存在；MVP 只顯示能力，不啟用推理。
- 本機儲存空間或 API 回報的限制。

#### 驗收條件

- 不讀取目前頁面即可完成能力檢查。
- 2 秒內顯示初步檢查結果；模型下載狀態可後續更新。
- 首次模型下載必須顯示進度、用途與可取消操作。
- 若 Chrome Built-in AI 不可用，說明可能原因並提供 Ollama 設定選項。
- 若 Ollama 因 extension origin 未獲 CORS 允許而失敗，提供依作業系統區分的設定說明。
- UI 永遠顯示目前預設 Provider，不進行無提示的 Provider 切換。

### 6.2 頁面內容擷取

#### 需求

- 只有在使用者點擊「摘要」、「問這個頁面」或明確加入頁面內容後才執行。
- 使用內容腳本擷取主要正文，不傳送原始完整 DOM。
- 移除 script、style、navigation、cookie banner、廣告及隱藏文字。
- 保留標題、段落、列表、程式碼區塊及原文定位資訊。
- 支援一般文章、技術文件、GitHub README／Issue 類型頁面。
- 動態 SPA 無法正確解析時，允許改用選取文字。

#### 驗收條件

- 未經使用者動作，不得擷取分頁正文。
- 擷取結果為結構化純文字，不包含可執行 HTML。
- 每個文字區塊具有穩定的 `sourceBlockId`。
- 點擊引用可將原始頁面捲動至對應區塊並短暫標示。
- 對 `chrome://`、Chrome Web Store、瀏覽器設定頁及其他受保護頁面顯示不可存取說明。
- 內容長度超出模型 context 時，必須採分塊及摘要合併，不得靜默截斷關鍵段落。

### 6.3 智慧摘要

#### 輸出模式

1. **快速摘要**：3–5 句。
2. **條列重點**：5–10 點，每點簡短明確。
3. **詳細大綱**：依原文結構產生階層式大綱。

#### 驗收條件

- 顯示頁面標題、來源網域、摘要時間及使用的 Provider／模型。
- 支援 streaming；使用者可隨時停止。
- 摘要只基於擷取內容，不加入未標示的外部知識。
- 內容不足時，顯示「沒有足夠可讀取內容」。
- 每個主要重點可展開查看至少一個支持片段。
- 重新執行相同頁面與模式時，可選擇使用本機快取。

### 6.4 問這個頁面

#### 需求

- 使用者可針對目前頁面連續提問。
- 問答前先以本機檢索選出相關文字區塊，再將有限內容交給模型。
- 回答與頁面來源片段分開顯示。
- 對找不到答案的問題明確拒答。

#### 驗收條件

- 每個有實質內容的回答附 1–3 個來源片段。
- 來源片段必須是頁面中可字串比對或定位的原文。
- 點擊來源可回跳原頁。
- 當檢索信心低於門檻時，回覆「目前頁面中找不到足夠資訊」。
- 頁面文字中的「忽略前述指令」等內容一律視為不可信資料，而不是系統指令。
- 問答功能不得擁有寄信、下載、提交表單或執行頁面指令等工具權限。

### 6.5 選取翻譯

#### 需求

- 使用者選取文字後，可透過右鍵選單或側邊欄翻譯。
- 優先使用 Chrome `Translator` API；不可用時使用目前模型 Provider。
- 顯示偵測語言、目標語言及實際翻譯引擎。
- 支援複製翻譯結果；MVP 不直接覆蓋網頁原文。

#### 驗收條件

- 選取後 150ms 內出現可操作介面，不代表翻譯已完成。
- 在已暖機、短文字與官方 Translator API 可用的情況下，翻譯結果 p95 目標小於 1 秒。
- 使用一般 LLM fallback 時，已暖機 p95 目標小於 3 秒；須標示這是目標而非所有硬體保證。
- 首次語言包下載顯示進度，不計入日常延遲指標。
- 未經使用者允許，不保存選取原文或翻譯結果。

### 6.6 隱私中心

#### 顯示內容

- 本次任務的內容來源。
- 使用的 Provider 與模型。
- 推理位置：Chrome on-device、WebGPU on-device 或 Ollama loopback。
- 是否保存輸入／輸出。
- 允許的外部目的地及用途。
- 「離線鎖定」狀態。
- 清除任務、快取、歷史及模型資料入口。

#### 離線鎖定

啟用後：

- 只允許擴充功能自身資源及 loopback。
- 停止授權刷新、模型版本檢查及遙測。
- 已下載模型與仍有效的本機授權可繼續使用。
- 若某項功能必須聯網，必須先說明並由使用者暫時解鎖。

---

## 7. 主要使用流程

### 7.1 首次使用

1. 安裝擴充功能。
2. 開啟 Side Panel。
3. 閱讀簡短隱私說明。
4. 執行裝置能力檢查。
5. 選擇 Chrome Built-in AI 或 Ollama。
6. 完成模型下載或 Ollama 連線測試。
7. 在示範頁執行第一次摘要。
8. 顯示本次資料路由與「頁面內容未傳送至雲端推理服務」狀態。

### 7.2 摘要目前頁面

1. 使用者在目前頁面開啟 Side Panel。
2. 點擊「摘要此頁」。
3. 擴充功能取得當前分頁的一次性存取權並擷取正文。
4. 使用者選擇快速、條列或詳細模式。
5. 本機模型串流產生結果。
6. 使用者展開原文依據、複製或清除結果。

### 7.3 詢問頁面

1. 使用者輸入問題。
2. 系統在本機切分與檢索相關段落。
3. 模型只收到問題及選出的段落。
4. 回覆顯示答案與來源片段。
5. 使用者點擊來源回到原頁位置。

### 7.4 選取翻譯

1. 使用者反白選取文字。
2. 右鍵選擇「使用 VerityRead／真閱翻譯」。
3. 系統打開或更新 Side Panel。
4. 顯示來源語言、目標語言、翻譯結果及引擎。
5. 使用者複製結果；原文不自動保存。

---

## 8. 技術架構

### 8.1 架構概覽

```text
[ Current Web Page ]
       │ user-initiated activeTab access
       ▼
[ Content Extractor ]
  - Main-content parsing
  - Text sanitization
  - Source block mapping
       │ structured plain text
       ▼
[ Extension Orchestrator ]
  - Permission control
  - Chunking / retrieval
  - Provider routing
  - Task cancellation
       │
       ├── Chrome Built-in AI Provider
       │    - LanguageModel
       │    - Summarizer
       │    - Translator
       │
       ├── Ollama Provider
       │    - 127.0.0.1:11434
       │
       └── WebGPU Provider [P1]
            - bundled runtime / worker
            - downloaded and verified model weights
       │
       ▼
[ Side Panel UI ]
  - Streaming result
  - Sources / jump-to-page
  - Privacy receipt
  - Settings
       │
       ▼
[ Local Storage ]
  - chrome.storage.local: preferences
  - IndexedDB: optional cache/history
  - no history by default
```

### 8.2 Extension 組件

| 組件 | 職責 |
|---|---|
| Manifest V3 Service Worker | 事件協調、權限、context menu、Provider health check、授權狀態；不執行長時間模型推理 |
| Side Panel | 主要 UI、任務狀態、Built-in AI session、串流結果與來源 |
| Content Script | 使用者觸發後擷取目前頁面、建立來源定位、執行回跳與標示 |
| Offscreen Document／Worker | P1 的 WebGPU、PDF parsing 或需長生命週期的背景工作；實際採用前先做技術 spike |
| Local Storage Layer | 設定、Prompt、快取與選擇性歷史 |

### 8.3 Provider Interface

所有模型後端應實作一致介面，避免功能直接依賴單一 API：

```ts
interface LocalAIProvider {
  id: string;
  displayName: string;
  healthCheck(): Promise<ProviderStatus>;
  capabilities(): Promise<Capability[]>;
  generate(request: GenerateRequest): AsyncIterable<GenerateEvent>;
  translate?(request: TranslateRequest): Promise<TranslateResult>;
  summarize?(request: SummarizeRequest): AsyncIterable<GenerateEvent>;
  cancel(taskId: string): Promise<void>;
  dispose(): Promise<void>;
}
```

Provider 不得自行決定將資料改送雲端。任何 fallback 都必須重新取得使用者同意；MVP 不提供雲端 fallback。

### 8.4 Chrome Built-in AI

- 透過執行時能力偵測，不假設所有 Chrome 使用者都有 Gemini Nano。
- 使用 `LanguageModel.availability()`、`Summarizer.availability()`、`Translator.availability()`。
- Prompt API 目前不應放入 Web Worker；由具 `window` context 的 Side Panel 或合適 extension page 呼叫。
- Session 應在使用者進入相關功能後預熱。
- 任務結束或切換模型後釋放不再使用的 session。
- 監控 context usage，長內容使用 chunk／map-reduce summarization。

### 8.5 Ollama Bridge

- 預設只連接 `http://127.0.0.1:11434`。
- 可測試 `/api/tags` 或等效健康端點，但不得將頁面內容放入健康檢查。
- Ollama 需要允許瀏覽器擴充功能 origin；Onboarding 必須提供設定說明。
- 安全建議優先允許目前 extension origin，而不是要求使用者永久開放所有 extension。
- 自訂 endpoint 在 P1 以前只允許 loopback；私人區網或遠端 IP 預設拒絕。
- 顯示目前模型、context window、預估內容長度及串流狀態。

### 8.6 WebGPU Provider（P1）

- 僅在核心需求驗證後實作。
- JS、WASM、worker 與 runtime 必須隨 extension 打包，不得執行遠端程式碼。
- 模型 weights 視為資料，可於使用者明確操作後下載並快取。
- 模型版本固定至明確 revision，下載後驗證 hash。
- 提供預估下載大小、記憶體需求及刪除模型入口。
- 初始候選應以實際裝置測試選擇，不在 PRD 中提前鎖定 Qwen、Gemma 或 Phi。
- MVP 之前完成至少三種基準裝置的品質、速度與記憶體比較。

### 8.7 本機檢索與儲存

- MVP 不導入 PGlite；資料量不足以合理化 Postgres WASM 的體積與複雜度。
- 目前頁面檢索先使用標題階層、關鍵字及小型 embedding 的混合策略。
- P1 將 embedding 與文件區塊保存於 IndexedDB。
- 小規模資料可直接 cosine search；達到明確效能瓶頸後再評估 SQLite-WASM／OPFS 或其他本機向量索引。
- 歷史保存預設關閉，啟用時須讓使用者設定保留天數與排除網域。

---

## 9. 隱私與安全需求

### 9.1 資料分類

| 資料 | 預設保存 | 可外傳 | 說明 |
|---|---:|---:|---|
| 網頁正文 | 否 | 否 | 僅目前任務記憶體 |
| 選取文字 | 否 | 否 | 任務結束後清除 |
| Prompt／回覆 | 否 | 否 | 使用者可選擇開啟本機歷史 |
| 頁面 URL／標題 | 否 | 否 | 不進入遙測或授權請求 |
| 使用偏好 | 是 | 否 | `chrome.storage.local` |
| 模型檔案 | 是 | 模型來源下載 | 不包含使用者內容 |
| 授權資訊 | 是 | 僅授權服務 | 不得包含頁面資料 |
| 錯誤資料 | 僅 opt-in | 可 | 必須移除內容、Prompt、URL 與 DOM |

### 9.2 權限

MVP 預計使用：

- `activeTab`
- `scripting`
- `storage`
- `sidePanel`
- `contextMenus`
- 必要時 `offscreen`
- loopback 的限定 host permission

原則：

- 不預設要求 `<all_urls>`。
- 需要持續支援的網站權限以 optional permission 方式逐次取得。
- Incognito 預設關閉。
- 敏感網站可設定「禁止整頁擷取，只允許選取文字」。

### 9.3 網路控制

允許的網路類型：

1. Chrome Web Store 自身更新。
2. 使用者主動啟動的模型／語言包下載。
3. Ollama loopback。
4. Pro 授權的最小化驗證。
5. 使用者明確 opt-in 的去識別錯誤回報。

禁止：

- 將頁面文字、Prompt、回覆、URL 或頁面標題送至上述任何外部服務。
- 遠端載入或執行 JavaScript／WASM。
- 未經同意的 analytics、廣告 SDK、session replay 或 fingerprinting。
- 由頁面內容控制請求 URL、header、端點或模型工具。

### 9.4 Content Security Policy

- `script-src 'self'`
- `object-src 'none'`
- `connect-src` 僅列出 extension 自身、loopback，以及經產品核准的模型與授權來源。
- 所有第三方 runtime 於 build time 打包。
- CI 對產物掃描遠端 JS／WASM import、`eval`、`new Function` 及不在 allowlist 的 endpoint。

### 9.5 Prompt Injection 與輸出安全

- 網頁內容一律包裝為不可信來源資料。
- system instruction 明確禁止服從頁面中的指令。
- 模型不具外部工具、寫入網頁、網路搜尋或檔案執行權限。
- LLM 輸出視為不可信文字，渲染前清理；禁止直接插入未清理 HTML。
- 來源引用須由應用層與原文對照，不僅依賴模型自行產生。

### 9.6 隱私測試

每次 release 必須：

- 執行自動化 egress 測試，確認頁面內容不出現在外部 request body、query、header 或 log。
- 執行靜態掃描，確認沒有未核准 endpoint。
- 驗證歷史關閉時，重新啟動瀏覽器後無任務內容殘留。
- 驗證「清除所有本機資料」後，設定範圍內資料確實刪除。
- 以至少一個 Gmail 類 SPA、一般文章、GitHub 頁面及敏感測試頁驗證最小權限行為。

---

## 10. 非功能需求

### 10.1 效能基準

建立兩台標準測試裝置：

- Apple Silicon、16 GB RAM。
- Windows 11、16 GB RAM、一般消費級 CPU／GPU。

目標：

| 指標 | 目標 |
|---|---|
| Side Panel 首次可互動 | p95 < 800ms |
| 主要正文擷取，3,000 字內 | p95 < 500ms |
| 已暖機摘要首字輸出 | Chrome AI p95 < 2s；Ollama 依模型另列 |
| 選取翻譯，專用 Translator 已暖機 | p95 < 1s |
| 任務取消回應 | < 300ms 顯示已停止 |
| Crash-free sessions | > 99% |

所有生成效能必須以 Provider、模型、裝置及輸入長度分開呈現，不以單一數字宣稱所有使用者皆可達成。

### 10.2 品質

- 摘要人工評估「忠於原文」達 85% 以上。
- 頁面問答來源引用可定位率達 98% 以上。
- 對不在頁面的問題，正確拒答率達 90% 以上。
- 主要頁面擷取成功率達 90% 以上。
- 翻譯品質依優先語言對個別測試，不以 LLM 自評。

### 10.3 可用性

- 所有長任務顯示進度、目前階段及停止按鈕。
- 錯誤訊息同時包含原因、影響及下一步。
- 支援鍵盤操作、可見 focus state 及螢幕閱讀器標籤。
- Provider 不可用時保留已輸入問題，不讓使用者重打。

### 10.4 相容性

MVP：

- Chrome Desktop stable channel。
- Windows 10／11、macOS 13+、Linux 視測試資源列為 best effort。
- 不支援 Chrome Android／iOS。

Edge 與 Firefox 即使部分 API 可用，也必須完成獨立 QA 後才能標示正式支援。

---

## 11. 商業化設計

### 11.1 原則

- 免費版必須能完成完整的核心工作，不設每日摘要或翻譯次數上限。
- Pro 販售的是進階工作流、資料規模與控制能力，不是「解除隱私」或雲端 Token。
- 付費授權不得取得頁面 URL、正文、Prompt 或回覆。
- Beta 前先驗證使用頻率與價值，不急著在技術 MVP 中加入付款。

### 11.2 建議方案

| 功能 | Free | Pro |
|---|---|---|
| 目前頁面摘要 | ✓ | ✓ |
| 問這個頁面＋原文引用 | ✓ | ✓ |
| 選取翻譯 | ✓ | ✓ |
| Chrome Built-in AI | ✓ | ✓ |
| 一個 Ollama endpoint／目前模型 | ✓ | ✓ |
| 內建快捷動作 | 5 組 | 全部 |
| 自訂 Prompt／快捷動作 | 3 組 | 無限制 |
| 本機 PDF | 單檔、基本 | 多檔、批次 |
| 多分頁比較 | — | ✓ |
| 本機歷史與 RAG | — | ✓ |
| 網站規則／進階過濾 | — | ✓ |
| 多模型與路由 profile | — | ✓ |
| 匯出與本機備份 | 基本 | 進階 |

### 11.3 價格假設

在 Beta 階段 A/B 測試：

- 年繳：US$39／年。
- Founder lifetime：US$59，一次性、限量。

這不是最終價格。若使用者明顯抗拒訂閱，可改採「一次購買＋一年重大版本更新」模式。

### 11.4 授權隱私

- 授權請求僅包含 license token、extension version、粗略平台及隨機安裝 ID。
- 不傳送裝置名稱、頁面資訊、Prompt、模型名稱或文件 metadata。
- 伺服器簽發可在本機驗證的 signed entitlement。
- 年繳方案提供至少 30 天離線寬限期。
- Lifetime 授權在首次啟用後不應要求固定週期連線。

### 11.5 E2EE Sync

暫不列入正式版承諾。即使使用端到端加密，仍會引入帳號、伺服器、metadata、復原及客服成本，也會讓「全本機」定位變得模糊。先提供 passphrase 加密的手動匯出／匯入。

---

## 12. 成功指標

### 12.1 北極星指標

**Weekly Successful Private Tasks（WSPT）**  
每週成功完成且未使用雲端推理的摘要、頁面問答或翻譯任務數。

### 12.2 產品指標

| 指標 | Beta 目標 |
|---|---:|
| 安裝後 10 分鐘內完成第一次任務 | ≥ 60% |
| 能完成 Provider 設定的使用者 | ≥ 70% |
| 任務成功率 | ≥ 90% |
| D7 留存 | ≥ 25% |
| 每位週活躍使用者每週成功任務 | ≥ 5 |
| 使用者對「資料路由」理解正確率 | ≥ 80% |
| 內容外傳事件 | 0 |
| Beta 滿意度 | ≥ 4.2 / 5 |

### 12.3 商業指標

- 只有當 D30 留存與週任務數達標後才啟動付費實驗。
- Free → Pro 轉換初始目標 3–5%。
- 退款原因需區分：模型不可用、速度、品質、功能缺失、隱私疑慮。

---

## 13. 路線圖與發布門檻

### Phase 0 — 技術可行性（1–2 週）

- 建立 Manifest V3 extension skeleton 與 Side Panel。
- 實測 Chrome Built-in AI API availability、下載及 session lifecycle。
- 實測 Ollama extension origin／CORS 與串流。
- 實作單頁擷取 prototype 與來源回跳。
- 完成網路 egress 測試框架。
- 驗證遠端程式碼、WASM 與模型 weights 的打包策略。

**進入下一階段條件：**

- 至少一個 Chrome AI 裝置與一個 Ollama 裝置完成摘要。
- 頁面內容未出現在任何外部 request。
- 可正確回跳至來源段落。

### Phase 1 — MVP Alpha（第 3–6 週）

- Onboarding 與 Provider capability matrix。
- Chrome Built-in AI／Ollama adapter。
- 頁面摘要三模式。
- 問頁面與來源引用。
- 選取翻譯。
- Privacy Center、離線鎖定、清除資料。
- 10–20 名技術與商務使用者封閉測試。

**Alpha 通過條件：**

- 首次設定成功率 ≥ 60%。
- 核心任務成功率 ≥ 85%。
- 無 P0 隱私與安全問題。

### Phase 2 — Public Beta（第 7–10 週）

- 本機 PDF。
- 自訂 Prompt。
- 本機快取、結果匯出。
- 效能與記憶體優化。
- 無障礙與錯誤恢復。
- Chrome Web Store 隱私揭露、商店素材與審核準備。
- 50 名以上測試者。

**公開上架條件：**

- Egress／權限／資料刪除測試全部通過。
- Crash-free sessions > 99%。
- 主要頁面擷取成功率 ≥ 90%。
- 已完成公開隱私政策與資料流程說明。

### Phase 3 — V1 與付費驗證（第 11–16 週）

- WebGPU fallback 技術驗證與有限發布。
- 多文件本機 RAG。
- 多分頁比較。
- Pro signed entitlement。
- Founder lifetime／年繳價格實驗。
- Product Hunt、Hacker News、LocalLLaMA 等社群發布。

### Phase 4 — 成長功能

只有在使用者研究確認需求後才啟動：

- 語意內容過濾。
- 搜尋頁面增強。
- Firefox／Edge。
- E2EE Sync。
- 企業 policy 與集中部署。

---

## 14. 主要風險與對策

| 風險 | 影響 | 對策 |
|---|---|---|
| Chrome Built-in AI 裝置覆蓋率不足 | 大量使用者無法開始 | Ollama 為第一級 Provider；WebGPU 於 P1 補足 |
| 本機模型速度與品質差異大 | 體驗不一致 | 顯示 Provider／模型；建立基準裝置；不做統一速度承諾 |
| Ollama CORS 設定造成流失 | Onboarding 失敗 | 自動診斷、逐平台引導、提供測試按鈕與安全設定範例 |
| 網頁擷取不穩定 | 摘要品質差 | Readability 類 parser＋selection fallback＋逐站 adapter |
| Prompt injection | 回覆受頁面惡意文字控制 | 不可信內容隔離、無工具權限、來源驗證、輸出清理 |
| 權限過大引發不信任或商店審核問題 | 安裝轉換低 | `activeTab`、optional permission、清楚的用途說明 |
| WebGPU 模型檔太大或記憶體不足 | 當機、差評 | 延後開發、明確硬體門檻、下載前告知、可刪除 |
| 「全本機」與授權／更新聯網矛盾 | 品牌信任受損 | 改用精確承諾、分離資料流、離線鎖定與隱私收據 |
| 與 Page Assist 等競品功能重疊 | 難以獲客 | 聚焦最小權限、可驗證資料路由、原文引用與商務敏感工作流 |
| Extension 前端授權易被破解 | 收入流失 | signed entitlement、合理 offline token；接受一定破解風險，不犧牲隱私 |

---

## 15. 待確認產品決策

開發前需完成以下決策：

1. 正式產品名稱、商標與網域。
2. 是否開源全部 extension 程式碼，或只公開 privacy-critical core。
3. 優先支援的翻譯語言對。
4. 第一批基準裝置及最低硬體門檻。
5. Ollama 推薦模型與 context window 建議，需以實測決定。
6. PDF 是否放入 Public Beta 或提前至 MVP。
7. 歷史紀錄預設完全關閉，或僅保留目前瀏覽 session。
8. Founder lifetime 與年繳是否同時測試。

建議優先決策：

- **Chrome only**
- **歷史預設關閉**
- **Free 可使用基本 Ollama**
- **PDF 放 Public Beta**
- **WebGPU 不進 MVP**
- **不提供雲端 fallback**
- **核心 privacy module 開源或至少提供可重現建置與外連測試**

---

## 16. 開發交接要求

在開始寫正式功能前，開發 AI 應先產出：

1. `ARCHITECTURE.md`：Extension contexts、message flow、Provider interface、storage 與 network boundaries。
2. `THREAT_MODEL.md`：資料分類、信任邊界、Prompt injection、XSS、Ollama endpoint、授權服務。
3. `TASKS.md`：依 Phase 0、MVP、Beta 拆分，可逐項驗收。
4. `PRIVACY_TEST_PLAN.md`：egress、資料殘留、權限與刪除測試。
5. `ADR/`：
   - ADR-001 Chrome-only MVP
   - ADR-002 activeTab instead of all_urls
   - ADR-003 Provider abstraction
   - ADR-004 no cloud inference
   - ADR-005 defer WebGPU
   - ADR-006 IndexedDB instead of PGlite for initial scale
6. MVP 完成定義：
   - 全部 P0 驗收條件通過。
   - 無未核准外連。
   - 測試裝置皆能完成摘要、頁面問答與翻譯。
   - Chrome Web Store build 中無遠端執行程式碼。

---

## 17. 技術依據

- Chrome Prompt API：  
  https://developer.chrome.com/docs/ai/prompt-api
- Chrome Translator API：  
  https://developer.chrome.com/docs/ai/translator-api
- Chrome Built-in AI production guidance：  
  https://developer.chrome.com/docs/ai/built-in-ai-dos-donts
- Chrome Side Panel API：  
  https://developer.chrome.com/docs/extensions/reference/api/sidePanel
- Chrome Offscreen API：  
  https://developer.chrome.com/docs/extensions/reference/api/offscreen
- Chrome Extension security guidance：  
  https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure
- Manifest V3 remote hosted code policy：  
  https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code
- Ollama browser extension origin／CORS：  
  https://docs.ollama.com/faq
- Transformers.js browser and cache behavior：  
  https://huggingface.co/docs/transformers.js/
  https://huggingface.co/docs/transformers.js/api/env
