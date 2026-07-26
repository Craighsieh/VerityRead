---
layout: home
title: VerityRead／真閱
---

# VerityRead／真閱

Local AI reading assistant. Accurate summaries. Privacy by design.

真閱是以本地 AI 為優先的 Chrome 閱讀助理，協助你摘要目前頁面、依原文提問，
以及翻譯選取文字。

## 發布狀態

VerityRead 0.1.0 已於 2026-07-26 提交 Chrome Web Store 審查，目前尚未公開
上架。審查通過後會自動發布；正式商店連結將在可用後補上。

## 開始前：選擇一條本地 AI 路徑

Ollama **不是所有使用者都必須安裝的前置程式**：

1. **Chrome Built-in AI** — 如果你的 Chrome 與裝置支援，無須另外安裝程式。
2. **Ollama** — 如果 Chrome Built-in AI 無法使用，或你希望指定本機模型，請完成一次 Ollama 設定。

真閱只會明確使用你選擇的 Provider，不會在背景自行切換，也不提供雲端推理
fallback。

### Ollama 建議模型

| 模型         | 適合情況                       | 約略下載大小 |
| ------------ | ------------------------------ | -----------: |
| `gemma4:e4b` | 品質優先；建議從這個模型開始   |       9.6 GB |
| `gemma4:e2b` | 希望縮小下載量或裝置資源較有限 |       7.2 GB |

模型大小依 [Ollama 官方 Gemma 4 模型庫](https://ollama.com/library/gemma4)
於 2026-07-26 所列資料整理，後續版本可能變動。模型下載會使用網路與磁碟空間，
但不會包含你閱讀的頁面內容。

### 分步安裝指南

- [English](setup/)
- [繁體中文](setup/zh-TW/)
- [简体中文](setup/zh-CN/)
- [日本語](setup/ja/)
- [한국어](setup/ko/)

- [Privacy Policy](privacy/)
- [隱私政策（繁體中文）](privacy/zh-TW)
- [隐私政策（简体中文）](privacy/zh-CN)
- [プライバシーポリシー](privacy/ja)
- [개인정보 처리방침](privacy/ko)
- [Support / 使用支援](support/)
- [Source code](https://github.com/craighsieh/VerityRead)

Support email: [craighsieh@gmail.com](mailto:craighsieh@gmail.com)
