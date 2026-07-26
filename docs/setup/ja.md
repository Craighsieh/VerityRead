---
layout: page
title: ローカル AI の設定
permalink: /setup/ja/
---

# VerityRead のローカル AI を設定する

[English](../) · [繁體中文](../zh-TW/) · [简体中文](../zh-CN/) ·
[日本語](./) · [한국어](../ko/)

VerityReadにはローカルAI Providerが1つ必要です。次のいずれかを選択してください。

- **Chrome Built-in AI：** Chromeと端末でモデルが利用可能な場合、別のアプリは不要です。
- **Ollama：** Chrome Built-in AIが利用できない場合、または特定のローカルモデルを
  使用したい場合にインストールします。

VerityReadがProviderを自動で切り替えることはなく、クラウド推論へのfallbackも
ありません。

## 1. Ollamaをインストール

[Ollama公式ダウンロードページ](https://ollama.com/download)からダウンロードし、
Ollamaを起動します。VerityRead 0.1.0が公式に対応するブラウザはChrome Desktopです。

## 2. 最初のモデルを1つインストール

最初は1つだけ選択してください。モデルは後から追加または削除できます。

| モデル       | 用途                               | ダウンロード容量の目安 |
| ------------ | ---------------------------------- | ---------------------: |
| `gemma4:e4b` | 品質優先。既定の推奨モデル         |                 9.6 GB |
| `gemma4:e2b` | ダウンロード容量を抑えたい端末向け |                 7.2 GB |

品質優先：

```bash
ollama pull gemma4:e4b
```

ダウンロード容量を抑える場合：

```bash
ollama pull gemma4:e2b
```

上記の容量は、2026-07-26に確認した
[Ollama公式Gemma 4ライブラリ](https://ollama.com/library/gemma4)
の情報に基づき、今後変更される場合があります。所要時間と生成速度はネットワークと
端末性能によって異なります。

## 3. VerityReadの拡張機能オリジンだけを許可

VerityReadにCORSエラーが表示された場合にのみ、この設定を行ってください。

エラーカードまたは`chrome://extensions`に表示される「拡張機能ID」をコピーし、
下記の`<EXTENSION_ID>`を実際の値に置き換えます。`*`は使用しないでください。

### macOS

メニューバーからOllamaを終了し、ターミナルで実行します。

```bash
launchctl setenv OLLAMA_ORIGINS "chrome-extension://<EXTENSION_ID>"
```

その後、Ollamaを再度開きます。

### Windows

システムトレイからOllamaを終了し、PowerShellで実行します。

```powershell
setx OLLAMA_ORIGINS "chrome-extension://<EXTENSION_ID>"
```

その後、スタートメニューからOllamaを再度開きます。

### Linux

Ollamaを手動で起動する場合：

```bash
OLLAMA_ORIGINS="chrome-extension://<EXTENSION_ID>" ollama serve
```

システムサービスを使用する場合は、Ollamaサービスの環境に同じ
`OLLAMA_ORIGINS`を設定して、サービスを再起動してください。環境変数の詳細は
[Ollama公式FAQ](https://docs.ollama.com/faq)を参照してください。

## 4. VerityReadで確認

1. VerityRead → **設定**を開きます。
2. **Ollama**を選択します。
3. インストール済みモデルを選択します。
4. **Ollama接続をテスト**を選択します。
5. Providerに**準備完了**と表示されてから続行します。

ヘルスチェックは`127.0.0.1:11434`からモデル情報のみを読み取り、ページ内容は
送信しません。接続できない場合はOllamaが起動しているか確認してください。モデルが
表示されない場合は`ollama pull`の完了を待ってから**再確認**を選択してください。

[VerityReadの紹介ページに戻る](../../)
