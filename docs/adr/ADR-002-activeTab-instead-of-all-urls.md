# ADR-002: activeTab instead of \<all_urls\>

## Status

Accepted

## Context

Broad host permissions reduce install conversion and increase store-review risk. Users distrust extensions that can read Gmail/bank pages in the background.

## Decision

Use `activeTab` + `scripting` + declared content script for http(s). Do not request `<all_urls>` by default. Optional permissions may be added later per-site if needed.

## Consequences

- Extract only after user gesture / active tab grant
- Some pages still inaccessible (`chrome://`, Web Store) — show clear errors
- Slightly more complex injection/messaging, better privacy posture
