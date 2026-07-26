---
layout: page
title: Set up local AI
permalink: /setup/
---

# Set up local AI for VerityRead

[English](./) · [繁體中文](zh-TW/) · [简体中文](zh-CN/) ·
[日本語](ja/) · [한국어](ko/)

VerityRead needs one local AI Provider. Choose either path:

- **Chrome Built-in AI:** No separate app is required when your Chrome version
  and device report the model as available.
- **Ollama:** Install it when Chrome Built-in AI is unavailable or when you
  prefer to manage a specific local model.

VerityRead never switches Providers without your action and does not use cloud
inference as a fallback.

## 1. Install Ollama

Download and start Ollama from the
[official download page](https://ollama.com/download). Chrome Desktop is the
supported browser for VerityRead 0.1.0.

## 2. Install one starter model

Start with one model. You can add or remove models later.

| Model        | Profile                                    | Approximate download |
| ------------ | ------------------------------------------ | -------------------: |
| `gemma4:e4b` | Quality-first; recommended default         |               9.6 GB |
| `gemma4:e2b` | Smaller download for a more limited device |               7.2 GB |

Quality-first:

```bash
ollama pull gemma4:e4b
```

Smaller download:

```bash
ollama pull gemma4:e2b
```

The sizes above reflect the
[official Ollama Gemma 4 library](https://ollama.com/library/gemma4) checked on
2026-07-26 and may change. Download time and generation speed depend on your
network and hardware.

## 3. Allow only the VerityRead extension origin

Skip this section unless VerityRead reports a CORS error.

Copy the Extension ID shown in VerityRead’s error card or in
`chrome://extensions`. Replace `<EXTENSION_ID>` below with that exact value.
Do not use `*`.

### macOS

Quit Ollama from the menu bar, run:

```bash
launchctl setenv OLLAMA_ORIGINS "chrome-extension://<EXTENSION_ID>"
```

Then reopen Ollama.

### Windows

Quit Ollama from the system tray. In PowerShell, run:

```powershell
setx OLLAMA_ORIGINS "chrome-extension://<EXTENSION_ID>"
```

Then reopen Ollama from the Start menu.

### Linux

If you start Ollama manually:

```bash
OLLAMA_ORIGINS="chrome-extension://<EXTENSION_ID>" ollama serve
```

For a system service, set the same `OLLAMA_ORIGINS` value in the Ollama
service environment and restart the service. See the
[official Ollama FAQ](https://docs.ollama.com/faq) for environment-variable
details.

## 4. Verify in VerityRead

1. Open VerityRead → **Settings**.
2. Select **Ollama**.
3. Select the installed model.
4. Choose **Test Ollama connection**.
5. Continue only after the Provider reports **Ready**.

The health check reads model metadata from `127.0.0.1:11434`; it does not send
page content. If Ollama cannot be reached, make sure the app is running. If no
model appears, wait for `ollama pull` to finish and choose **Re-check**.

[Return to the VerityRead introduction](../)
