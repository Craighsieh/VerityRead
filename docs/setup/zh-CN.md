---
layout: page
title: 设置本地 AI
permalink: /setup/zh-CN/
---

# 为真阅设置本地 AI

[English](../) · [繁體中文](../zh-TW/) · [简体中文](./) ·
[日本語](../ja/) · [한국어](../ko/)

真阅需要一个本地 AI Provider，请选择其中一条路径：

- **Chrome Built-in AI：** 如果你的 Chrome 和设备显示模型可用，无需另外安装程序。
- **Ollama：** 如果 Chrome Built-in AI 不可用，或你希望指定本地模型，才需要安装。

真阅不会自行切换 Provider，也不提供云端推理 fallback。

## 1. 安装 Ollama

请从 [Ollama 官方下载页](https://ollama.com/download)下载并启动 Ollama。
真阅 0.1.0 正式支持 Chrome Desktop。

## 2. 安装一个入门模型

开始时只需选择一个模型，之后仍可添加或移除。

| 模型         | 定位                           | 约略下载大小 |
| ------------ | ------------------------------ | -----------: |
| `gemma4:e4b` | 质量优先；默认推荐             |       9.6 GB |
| `gemma4:e2b` | 下载较小，适合资源较有限的设备 |       7.2 GB |

质量优先：

```bash
ollama pull gemma4:e4b
```

较小下载：

```bash
ollama pull gemma4:e2b
```

以上大小根据
[Ollama 官方 Gemma 4 模型库](https://ollama.com/library/gemma4)
在 2026-07-26 列出的数据整理，之后可能变化。下载时间和生成速度取决于网络和硬件。

## 3. 仅允许真阅的扩展程序来源

只有在真阅显示 CORS 错误时，才需要执行本节。

请从真阅错误卡或 `chrome://extensions` 复制“扩展程序 ID”，并使用实际值替换
下方的 `<EXTENSION_ID>`。请勿使用 `*`。

### macOS

从菜单栏退出 Ollama，然后在“终端”运行：

```bash
launchctl setenv OLLAMA_ORIGINS "chrome-extension://<EXTENSION_ID>"
```

接着重新打开 Ollama。

### Windows

从系统托盘退出 Ollama，然后在 PowerShell 运行：

```powershell
setx OLLAMA_ORIGINS "chrome-extension://<EXTENSION_ID>"
```

接着从“开始”菜单重新打开 Ollama。

### Linux

如果你手动启动 Ollama：

```bash
OLLAMA_ORIGINS="chrome-extension://<EXTENSION_ID>" ollama serve
```

如果使用系统服务，请在 Ollama 服务环境中设置相同的 `OLLAMA_ORIGINS`，然后重启
服务。环境变量详情请参考 [Ollama 官方 FAQ](https://docs.ollama.com/faq)。

## 4. 在真阅中验证

1. 打开真阅 → **设置**。
2. 选择 **Ollama**。
3. 选择已安装的模型。
4. 点击 **测试 Ollama 连接**。
5. 等 Provider 显示**已就绪**后再继续。

健康检查只会从 `127.0.0.1:11434` 读取模型信息，不会发送页面内容。如果无法连接，
请确认 Ollama 已启动；如果没有显示模型，请等待 `ollama pull` 完成后点击**重新检查**。

[返回真阅介绍页](../../)
