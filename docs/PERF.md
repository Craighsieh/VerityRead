# Performance Measurement Notes

## Target devices (PRD §10.1)

1. Apple Silicon, 16 GB RAM  
2. Windows 11, 16 GB RAM, consumer CPU/GPU  

## Targets

| Metric | Target |
|---|---|
| Side Panel first interactive | p95 < 800ms |
| Extract ≤ 3,000 words | p95 < 500ms |
| Summarize first token (Chrome AI, warm) | p95 < 2s |
| Translate (Translator warm) | p95 < 1s |
| Cancel acknowledged | < 300ms |

## How to measure

1. Open DevTools Performance / mark `performance.now()` around:
   - Side Panel mount (`main.tsx` → first paint)
   - `EXTRACT_PAGE` round-trip
   - first `token` event from summarize/translate
2. Record Provider, model, device, input length with each sample.
3. Do **not** publish a single number as universal.

## Helper

Labs tab and streaming UI already expose stage strings (`Extracting page…`, `Generating summary…`). Extend with chrome.storage performance logs if needed in Alpha.
