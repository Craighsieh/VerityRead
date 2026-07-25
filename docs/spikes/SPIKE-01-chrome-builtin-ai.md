# Spike 1 — Chrome Built-in AI

## Goal

Validate LanguageModel / Summarizer / Translator availability, download, session lifecycle, streaming, and window-context constraint.

## How to run

1. Load unpacked `dist/`
2. Open Side Panel → Labs → **Spike Chrome AI**
3. Optionally complete Onboarding with Chrome Built-in AI and run Summarize

## Expected observations

- `availability()` returns one of: available / downloadable / downloading / unavailable (or legacy readily / after-download normalized)
- Prompt API is invoked from Side Panel (window context), not the service worker
- Sessions are created per task and destroyed in `finally`
- WebGPU presence is reported but not used for inference (MVP)

## Decision

Proceed with runtime capability detection + Provider adapter. Do not hard-code `window.ai`.
