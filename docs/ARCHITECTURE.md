# VaultLens Architecture

## Extension contexts

| Context | Entry | Role |
|---|---|---|
| Service Worker | `src/background/index.ts` | Event coordination, context menus, preference/health routing, tab messaging. Does **not** run long model inference. |
| Side Panel | `src/sidepanel/*` | Primary React UI, Built-in AI sessions (window context), streaming, Privacy Center, Onboarding. |
| Content Script | `src/content/index.ts` | User-triggered extract, source jump + highlight. Never auto-reads on load. |

## Message flow

```
Side Panel ──runtime.sendMessage──► Background ──tabs.sendMessage──► Content Script
     ▲                                    │                              │
     └──────────── responses / results ───┴──────────────────────────────┘
```

All messages are typed discriminated unions in `src/shared/messages.ts` with `requestId` and optional `taskId`. Cancellation propagates via `CANCEL_TASK` / `TaskOrchestrator.cancel`.

## Provider interface

`LocalAIProvider` (`src/providers/types.ts`) abstracts:

- `healthCheck`, `capabilities`
- `generate` (AsyncIterable stream)
- optional `summarize`, `translate`
- `cancel`, `dispose`

Implementations:

- `ChromeBuiltinAIProvider` — LanguageModel / Summarizer / Translator via runtime detection
- `OllamaProvider` — loopback `127.0.0.1:11434` only

`ProviderRegistry` persists the default provider and **never** silent-falls-back.

## Storage boundaries

| Store | Contents | Default |
|---|---|---|
| `chrome.storage.local` | Preferences | Persisted |
| IndexedDB `summaryCache` | Optional summary cache | Opt-in via setting |
| IndexedDB `history` | Optional history | **Off** by default |
| Task memory | Page extract / selection | Cleared after task |

## Network boundaries

Allowed:

- Extension self resources
- Ollama loopback
- User-initiated Chrome Built-in AI model/language pack download
- Chrome Web Store updates

Forbidden:

- Page text / prompts / replies / URLs in any external request
- Remote JS/WASM execution
- Cloud inference fallback (MVP)
- Non-loopback custom model endpoints (MVP)

Offline Lock (`src/core/offlineLock.ts`) restricts fetches to extension + loopback.

## Content pipeline

1. User clicks Summarize / Ask / Translate
2. Content script extracts structured plain-text blocks with `sourceBlockId`
3. Orchestrator chunks + (for Ask) retrieves top-k passages
4. Provider generates; UI streams tokens
5. Citations verified against page text; jump-back via locator

## Key modules

- `src/core/extract.ts` — Readability + DOM block mapping
- `src/core/chunk.ts` — token-budget chunking / map-reduce plan
- `src/core/retrieve.ts` — BM25-ish + heading boost
- `src/core/orchestrator.ts` — task orchestration + privacy receipts
- `src/shared/sanitize.ts` — untrusted output + prompt wrapping
