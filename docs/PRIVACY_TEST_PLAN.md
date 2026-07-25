# VaultLens Privacy Test Plan

## 1. Egress tests

**Goal:** Page content never appears in external request body, query, header, or logs.

| ID | Case | Steps | Pass |
|---|---|---|---|
| E1 | Summarize article | Load fixture, run summarize with Chrome AI or Ollama | Markers absent from non-exempt requests |
| E2 | Ask page | Ask question containing unique page phrase | Markers absent externally |
| E3 | Translate selection | Translate selected confidential string | Selection absent externally |
| E4 | Health check | Run capability/health | No page URL/title/body in Ollama `/api/tags` |

Automation: `pnpm test:egress` (`tests/e2e/egress.spec.ts`).

Exempt destinations: `chrome-extension:`, `data:`, `127.0.0.1`, `localhost`.

## 2. Static product scan

| ID | Case | Pass |
|---|---|---|
| S1 | No `eval` / `new Function` in dist | `pnpm scan:dist` |
| S2 | No remote `.js` / `.wasm` imports | same |
| S3 | Endpoints allowlisted | same |

## 3. Data residue

| ID | Case | Pass |
|---|---|---|
| R1 | History off + browser restart | No task content in storage/IDB |
| R2 | Clear all local data | Preferences reset scope + cache/history empty |
| R3 | Selection translate | Selection not persisted |

## 4. Permissions

| ID | Case | Pass |
|---|---|---|
| P1 | No auto extract on navigate | Content script idle until message |
| P2 | `chrome://` / Web Store | Shows PAGE_PROTECTED |
| P3 | Gmail-class SPA | Quality fallback / selection guidance |
| P4 | GitHub README/Issue | Extract + jump works |

## 5. Offline Lock

| ID | Case | Pass |
|---|---|---|
| O1 | Lock ON + non-loopback fetch | `OFFLINE_LOCK_BLOCKED` |
| O2 | Lock ON + Ollama loopback | Allowed |
| O3 | Lock ON + model download | Blocked until user unlocks |

## Release gate

Every release must run: unit tests, egress harness, `scan:dist`, manual smoke on article + GitHub + protected page.
