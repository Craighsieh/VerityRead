---
layout: page
title: 設定本地 AI
permalink: /setup/zh-TW/
---

# 為真閱設定本地 AI

[English](../) · [繁體中文](./) · [简体中文](../zh-CN/) ·
[日本語](../ja/) · [한국어](../ko/)

真閱需要一個本地 AI Provider，請選擇其中一條路徑：

- **Chrome Built-in AI：** 如果你的 Chrome 與裝置顯示模型可使用，不必另外安裝程式。
- **Ollama：** 如果 Chrome Built-in AI 無法使用，或你想指定本機模型，才需要安裝。

真閱不會自行切換 Provider，也不提供雲端推理 fallback。

## 1. 安裝 Ollama

請從 [Ollama 官方下載頁](https://ollama.com/download)下載並啟動 Ollama。
真閱 0.1.0 正式支援 Chrome Desktop。

## 2. 安裝一個入門模型

一開始只需選擇一個模型，之後仍可新增或移除。

| 模型         | 定位                           | 約略下載大小 |
| ------------ | ------------------------------ | -----------: |
| `gemma4:e4b` | 品質優先；預設建議             |       9.6 GB |
| `gemma4:e2b` | 下載較小，適合資源較有限的裝置 |       7.2 GB |

品質優先：

```bash
ollama pull gemma4:e4b
```

較小下載：

```bash
ollama pull gemma4:e2b
```

以上大小依
[Ollama 官方 Gemma 4 模型庫](https://ollama.com/library/gemma4)
於 2026-07-26 所列資料整理，後續可能變動。下載時間與生成速度會依網路及硬體而異。

## 3. 只允許真閱的擴充功能來源

只有當真閱顯示 CORS 錯誤時，才需要執行本節。

請從真閱錯誤卡或 `chrome://extensions` 複製「擴充功能 ID」，並以實際值取代
下方的 `<EXTENSION_ID>`。請勿使用 `*`。

### macOS

從選單列結束 Ollama，然後在「終端機」執行：

```bash
launchctl setenv OLLAMA_ORIGINS "chrome-extension://<EXTENSION_ID>"
```

接著重新開啟 Ollama。

### Windows

從系統匣結束 Ollama，然後在 PowerShell 執行：

```powershell
setx OLLAMA_ORIGINS "chrome-extension://<EXTENSION_ID>"
```

接著從「開始」選單重新開啟 Ollama。

### Linux

若你手動啟動 Ollama：

```bash
OLLAMA_ORIGINS="chrome-extension://<EXTENSION_ID>" ollama serve
```

若使用系統服務，請在 Ollama 服務環境中設定相同的 `OLLAMA_ORIGINS`，再重新啟動
服務。環境變數細節請參考 [Ollama 官方 FAQ](https://docs.ollama.com/faq)。

## 4. 在真閱內驗證

1. 開啟真閱 → **設定**。
2. 選擇 **Ollama**。
3. 選擇已安裝的模型。
4. 按下 **測試 Ollama 連線**。
5. 等 Provider 顯示**已就緒**後再繼續。

健康檢查只會從 `127.0.0.1:11434` 讀取模型資訊，不會傳送頁面內容。若無法連線，
請確認 Ollama 已啟動；若沒有顯示模型，請等 `ollama pull` 完成後按**重新檢查**。

[返回真閱介紹頁](../../)
