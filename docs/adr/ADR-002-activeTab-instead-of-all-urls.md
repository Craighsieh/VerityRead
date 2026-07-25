# ADR-002: activeTab instead of \<all_urls\>

## Status

Accepted

## Context

Broad host permissions reduce install conversion and increase store-review risk. Users distrust extensions that can read Gmail/bank pages in the background.

## Decision

Use `activeTab` + `scripting` and inject the page reader only after a user starts
a page task. Do not ship a static content script or request `<all_urls>` at
installation.

Declare `http://*/*` and `https://*/*` only as optional host capabilities so a
user may choose persistent access. At runtime, request only the exact current
origin (for example, `https://example.com/*`) and expose a matching revoke
control in Settings.

## Consequences

- Extract only after user gesture / active tab grant
- Persistent access is optional and exact-site scoped
- Some pages still inaccessible (`chrome://`, Web Store) — show clear errors
- Slightly more complex injection/messaging, better privacy posture
