import { useState } from 'react';
import { createTaskId } from '@/shared/messages';
import { sendMessage } from '@/shared/messaging';
import { createAppError, isAppError } from '@/shared/errors';
import type {
  AppError,
  ExtractedPage,
  PrivacyReceipt,
  SourceCitation,
  SummarizeMode,
  UserPreferences,
} from '@/shared/types';
import { taskOrchestrator } from '@/core/orchestrator';
import { ErrorBox } from './ErrorBox';
import { Citations } from './Citations';
import { PrivacyReceiptView } from './PrivacyReceiptView';

interface Props {
  preferences: UserPreferences;
}

export function SummarizePanel({ preferences }: Props) {
  const [mode, setMode] = useState<SummarizeMode>('quick');
  const [streaming, setStreaming] = useState('');
  const [stage, setStage] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [receipt, setReceipt] = useState<PrivacyReceipt | null>(null);
  const [citations, setCitations] = useState<SourceCitation[]>([]);
  const [meta, setMeta] = useState<{ title: string; domain: string; at: string } | null>(
    null,
  );
  const [taskId, setTaskId] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const stop = () => {
    if (taskId) {
      taskOrchestrator.cancel(taskId);
      setRunning(false);
      setStage('Stopped');
    }
  };

  const run = async () => {
    const id = createTaskId();
    setTaskId(id);
    setRunning(true);
    setError(null);
    setStreaming('');
    setReceipt(null);
    setCitations([]);
    setFromCache(false);
    setStage('Extracting page…');

    try {
      const extractResult = await sendMessage({
        type: 'EXTRACT_PAGE',
        taskId: id,
        scope: 'page',
      });
      if (
        !extractResult ||
        extractResult.type !== 'EXTRACT_PAGE_RESULT' ||
        extractResult.error ||
        !extractResult.page
      ) {
        throw (
          (extractResult &&
            extractResult.type === 'EXTRACT_PAGE_RESULT' &&
            extractResult.error) ||
          createAppError('PAGE_INACCESSIBLE')
        );
      }

      const page: ExtractedPage = extractResult.page;
      setMeta({
        title: page.title,
        domain: page.domain,
        at: new Date().toLocaleString(),
      });
      setStage('Generating summary…');

      const result = await taskOrchestrator.summarize(id, page, mode, {
        providerId: preferences.defaultProviderId,
        useCache: preferences.cacheSummaries,
        onEvent: (event) => {
          if (event.type === 'token' && event.text) {
            setStreaming((prev) => prev + event.text);
          }
          if (event.type === 'progress' && event.stage) {
            setStage(event.stage);
          }
          if (event.type === 'done' && event.fullText) {
            setStreaming(event.fullText);
          }
        },
      });

      setStreaming(result.text);
      setReceipt(result.receipt);
      setCitations(result.citations);
      setFromCache(result.fromCache);
      setStage(result.fromCache ? 'Loaded from local cache' : 'Done');
    } catch (err) {
      setError(isAppError(err) ? err : createAppError('UNKNOWN', { cause: String(err) }));
      setStage('');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="stack">
      <div className="card stack">
        <h2>Summarize this page</h2>
        <p className="muted">
          Reads the current tab only after you click. Uses{' '}
          <strong>{preferences.defaultProviderId}</strong>.
        </p>
        <div className="row" role="group" aria-label="Summary mode">
          {(
            [
              ['quick', 'Quick'],
              ['bullets', 'Bullets'],
              ['outline', 'Outline'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`btn ${mode === value ? 'primary' : ''}`}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="row">
          <button
            type="button"
            className="btn primary"
            disabled={running}
            onClick={() => void run()}
          >
            Summarize
          </button>
          <button type="button" className="btn" disabled={!running} onClick={stop}>
            Stop
          </button>
        </div>
        {stage && <p className="muted">{stage}</p>}
      </div>

      {error && <ErrorBox error={error} />}

      {(streaming || meta) && (
        <div className="card stack">
          {meta && (
            <div className="muted">
              <div>
                <strong>{meta.title}</strong>
              </div>
              <div>
                {meta.domain} · {meta.at}
                {fromCache ? ' · cache' : ''}
              </div>
              <div>Provider: {preferences.defaultProviderId}</div>
            </div>
          )}
          <div className="stream" aria-live="polite">
            {streaming || '…'}
          </div>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => void navigator.clipboard.writeText(streaming)}
              disabled={!streaming}
            >
              Copy
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setStreaming('');
                setReceipt(null);
                setCitations([]);
              }}
            >
              Clear
            </button>
          </div>
          <Citations citations={citations} />
        </div>
      )}

      {receipt && <PrivacyReceiptView receipt={receipt} />}
    </div>
  );
}
