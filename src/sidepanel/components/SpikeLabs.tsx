/**
 * Phase 0 Labs — capability / CORS / extract spike surfaces for verification.
 */
import { useState } from 'react';
import { probeChromeAvailability } from '@/providers/chromeBuiltin';
import { OllamaProvider, OLLAMA_CORS_GUIDE } from '@/providers/ollama';
import { sendMessage } from '@/shared/messaging';
import { createTaskId } from '@/shared/messages';

export function SpikeLabs() {
  const [log, setLog] = useState('');
  const append = (line: string) => setLog((prev) => `${prev}${prev ? '\n' : ''}${line}`);

  const spikeChrome = async () => {
    append('--- Spike 1: Chrome Built-in AI ---');
    const avail = await probeChromeAvailability();
    append(JSON.stringify(avail, null, 2));
    append(
      'Note: Prompt API requires a window context (Side Panel). Do not call from Worker.',
    );
  };

  const spikeOllama = async () => {
    append('--- Spike 2: Ollama ---');
    const provider = new OllamaProvider();
    const status = await provider.healthCheck();
    append(JSON.stringify(status, null, 2));
    append('CORS guides: ' + Object.keys(OLLAMA_CORS_GUIDE).join(', '));
    append('Extension origin: chrome-extension://' + chrome.runtime.id);
  };

  const spikeExtract = async () => {
    append('--- Spike 3: Extract + jump ---');
    const result = await sendMessage({
      type: 'EXTRACT_PAGE',
      taskId: createTaskId(),
      scope: 'page',
    });
    if (result?.type === 'EXTRACT_PAGE_RESULT') {
      if (result.error) {
        append('Error: ' + JSON.stringify(result.error));
        return;
      }
      const page = result.page!;
      append(
        `title=${page.title} blocks=${page.blocks.length} words=${page.wordCount} quality=${page.qualityScore}`,
      );
      const first = page.blocks[0];
      if (first) {
        append(`Jumping to ${first.sourceBlockId}`);
        const jump = await sendMessage({
          type: 'JUMP_TO_SOURCE',
          sourceBlockId: first.sourceBlockId,
          locator: first.locator,
        });
        append('Jump result: ' + JSON.stringify(jump));
      }
    } else {
      append('Unexpected response');
    }
  };

  return (
    <div className="stack">
      <div className="card stack">
        <h2>Phase 0 Labs</h2>
        <p className="muted">
          Technical spikes for Chrome AI, Ollama CORS, and extract/jump. Results stay
          local.
        </p>
        <div className="row">
          <button type="button" className="btn" onClick={() => void spikeChrome()}>
            Spike Chrome AI
          </button>
          <button type="button" className="btn" onClick={() => void spikeOllama()}>
            Spike Ollama
          </button>
          <button type="button" className="btn" onClick={() => void spikeExtract()}>
            Spike Extract
          </button>
          <button type="button" className="btn ghost" onClick={() => setLog('')}>
            Clear log
          </button>
        </div>
      </div>
      <div className="card">
        <pre className="stream">{log || 'Run a spike to see output…'}</pre>
      </div>
    </div>
  );
}
