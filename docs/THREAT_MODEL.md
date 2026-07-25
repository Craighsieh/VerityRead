# VerityRead Threat Model

## Data classification (PRD §9.1)

| Data | Persist by default | Exfiltrate | Notes |
|---|---|---|---|
| Page body | No | No | Task memory only |
| Selection | No | No | Cleared after task |
| Prompt / reply | No | No | Optional local history |
| Page URL / title | No | No | Not in telemetry/license |
| Preferences | Yes | No | `chrome.storage.local` |
| Model files | Yes | Download source only | No user content |
| License | Yes | License service only | No page data |
| Errors | No | No | Displayed locally; no telemetry in version 0.1.0 |

## Trust boundaries

```
[Web Page DOM] --untrusted--> [Content Script extract]
                                      |
                                      v
                              [Structured text]
                                      |
                                      v
                         [Orchestrator / Provider]
                                      |
                 +--------------------+--------------------+
                 |                    |                    |
         Chrome on-device         Ollama loopback      (P1 WebGPU)
```

- Page content is **untrusted data**, never instructions.
- Model output is **untrusted text**; sanitize before render.
- Ollama is trusted as a local process but network-limited to loopback.

## Prompt injection

Threat: page contains “ignore previous instructions”, tool calls, etc.

Mitigations:

- `wrapUntrustedContext()` delimiters + system rules
- No tool permissions (no email/form/browse)
- Citations verified by app layer against original blocks
- Low retrieval confidence → refuse to answer

## XSS / output injection

Threat: model returns HTML/script rendered into Side Panel.

Mitigations:

- `sanitizeText` strips tags/handlers
- UI uses text nodes / React text, not raw `dangerouslySetInnerHTML`

## Ollama endpoint abuse

Threat: extension pointed at remote host → data exfil.

Mitigations:

- Only the exact endpoint `http://127.0.0.1:11434` is allowed
- `localhost`, alternate ports, credentials, paths, LAN addresses, and remote hosts are rejected
- Health checks never include page content
- CORS guide prefers extension-origin allowlist

## Extension permissions

Threat: broad `<all_urls>` erodes trust / store review.

Mitigations:

- MVP permissions: `activeTab`, `scripting`, `storage`, `sidePanel`, `contextMenus`
- Host permission only for Ollama loopback
- No static content script; extract only after a user-triggered task
- Persistent website access is optional, requested for one exact origin, and revocable in Settings

## Update and model-download channels

Threat: page data mixed into extension update or model/language-pack download requests.

Mitigations:

- Separate data planes; Offline Lock
- No account, license service, analytics, or developer backend in version 0.1.0
- Egress tests assert markers never leave

## Residual risks

- Malicious page can still *attempt* injection (mitigated, not eliminated)
- Local malware with OS access can read Ollama or browser profile
- Extension UI license checks (future) are bypassable client-side
