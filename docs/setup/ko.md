---
layout: page
title: 로컬 AI 설정
permalink: /setup/ko/
---

# VerityRead 로컬 AI 설정

[English](../) · [繁體中文](../zh-TW/) · [简体中文](../zh-CN/) ·
[日本語](../ja/) · [한국어](./)

VerityRead에는 하나의 로컬 AI Provider가 필요합니다. 다음 중 하나를 선택하세요.

- **Chrome Built-in AI:** Chrome과 기기에서 모델을 사용할 수 있다면 별도의 앱을
  설치할 필요가 없습니다.
- **Ollama:** Chrome Built-in AI를 사용할 수 없거나 특정 로컬 모델을 직접 관리하려는
  경우 설치합니다.

VerityRead는 사용자 동의 없이 Provider를 전환하지 않으며 클라우드 추론 fallback을
사용하지 않습니다.

## 1. Ollama 설치

[Ollama 공식 다운로드 페이지](https://ollama.com/download)에서 다운로드한 후
Ollama를 실행하세요. VerityRead 0.1.0이 공식적으로 지원하는 브라우저는 Chrome Desktop입니다.

## 2. 시작 모델 하나 설치

처음에는 모델 하나만 선택하세요. 나중에 모델을 추가하거나 삭제할 수 있습니다.

| 모델         | 용도                            | 대략적인 다운로드 크기 |
| ------------ | ------------------------------- | ---------------------: |
| `gemma4:e4b` | 품질 우선. 기본 권장 모델       |                  9.6GB |
| `gemma4:e2b` | 다운로드 용량을 줄이려는 기기용 |                  7.2GB |

품질 우선:

```bash
ollama pull gemma4:e4b
```

더 작은 다운로드:

```bash
ollama pull gemma4:e2b
```

위 크기는 2026-07-26에 확인한
[Ollama 공식 Gemma 4 라이브러리](https://ollama.com/library/gemma4)
정보를 기준으로 하며 이후 변경될 수 있습니다. 다운로드 시간과 생성 속도는 네트워크와
기기 성능에 따라 달라집니다.

## 3. VerityRead 확장 프로그램 출처만 허용

VerityRead에 CORS 오류가 표시될 때만 이 설정을 진행하세요.

오류 카드 또는 `chrome://extensions`에 표시된 확장 프로그램 ID를 복사하고 아래의
`<EXTENSION_ID>`를 실제 값으로 바꾸세요. `*`는 사용하지 마세요.

### macOS

메뉴 막대에서 Ollama를 종료한 후 터미널에서 실행하세요.

```bash
launchctl setenv OLLAMA_ORIGINS "chrome-extension://<EXTENSION_ID>"
```

그런 다음 Ollama를 다시 실행하세요.

### Windows

시스템 트레이에서 Ollama를 종료한 후 PowerShell에서 실행하세요.

```powershell
setx OLLAMA_ORIGINS "chrome-extension://<EXTENSION_ID>"
```

그런 다음 시작 메뉴에서 Ollama를 다시 실행하세요.

### Linux

Ollama를 직접 실행하는 경우:

```bash
OLLAMA_ORIGINS="chrome-extension://<EXTENSION_ID>" ollama serve
```

시스템 서비스를 사용하는 경우 Ollama 서비스 환경에 같은 `OLLAMA_ORIGINS` 값을
설정하고 서비스를 다시 시작하세요. 환경 변수에 대한 자세한 내용은
[Ollama 공식 FAQ](https://docs.ollama.com/faq)를 확인하세요.

## 4. VerityRead에서 확인

1. VerityRead → **설정**을 여세요.
2. **Ollama**를 선택하세요.
3. 설치된 모델을 선택하세요.
4. **Ollama 연결 테스트**를 선택하세요.
5. Provider가 **준비됨**으로 표시된 후 계속하세요.

상태 확인은 `127.0.0.1:11434`에서 모델 정보만 읽으며 페이지 내용은 보내지 않습니다.
연결할 수 없다면 Ollama가 실행 중인지 확인하세요. 모델이 표시되지 않으면
`ollama pull`이 끝날 때까지 기다린 후 **다시 확인**을 선택하세요.

[VerityRead 소개 페이지로 돌아가기](../../)
