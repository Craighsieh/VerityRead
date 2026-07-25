# Spike 3 — Extract + jump-back

## Goal

Prototype main-content extract with stable `sourceBlockId` and Side Panel → content script jump + highlight.

## How to run

1. Open a normal article / GitHub README
2. Labs → **Spike Extract** (or Summarize and click a source)

## Expected observations

- Structured blocks with locator + fingerprint
- Clicking citation scrolls and briefly highlights
- Protected pages return `PAGE_PROTECTED`

## Decision

Ship Readability + DOM block mapping. SPA low-quality extracts prompt selection fallback.
