# Spike 2 — Ollama bridge

## Goal

Validate extension-origin CORS, `/api/tags` health (no page content), NDJSON streaming, abort, and OS-specific CORS copy.

## How to run

1. Start Ollama locally; `ollama pull llama3.2` (or any model)
2. Set `OLLAMA_ORIGINS=chrome-extension://<id>`
3. Labs → **Spike Ollama** or Onboarding connection test

## Expected observations

- Healthy status lists models
- CORS failure surfaces `OLLAMA_CORS` with macOS/Windows/Linux steps
- Only `127.0.0.1` / `localhost` accepted

## Decision

Ollama is a first-class Provider. Free tier keeps basic Ollama. Remote endpoints rejected until P1+.
