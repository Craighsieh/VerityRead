import { useState } from 'react';
import { createTaskId } from '@/shared/messages';
import { sendMessage } from '@/shared/messaging';
import { createAppError, isAppError } from '@/shared/errors';
import type {
  AppError,
  PrivacyReceipt,
  SourceCitation,
  UserPreferences,
} from '@/shared/types';
import { taskOrchestrator } from '@/core/orchestrator';
import { ErrorBox } from './ErrorBox';
import { Citations } from './Citations';
import { PrivacyReceiptView } from './PrivacyReceiptView';

interface Props {
  preferences: UserPreferences;
}

interface Turn {
  question: string;
  answer: string;
  citations: SourceCitation[];
}

export function AskPanel({ preferences }: Props) {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [receipt, setReceipt] = useState<PrivacyReceipt | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const stop = () => {
    if (taskId) {
      taskOrchestrator.cancel(taskId);
      setRunning(false);
    }
  };

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    const id = createTaskId();
    setTaskId(id);
    setRunning(true);
    setError(null);
    setStreaming('');
    setReceipt(null);

    try {
      const extractResult = await sendMessage({
        type: 'EXTRACT_PAGE',
        taskId: id,
        scope: 'page',
      });
      if (
        !extractResult ||
        extractResult.type !== 'EXTRACT_PAGE_RESULT' ||
        !extractResult.page
      ) {
        throw extractResult?.type === 'EXTRACT_PAGE_RESULT' && extractResult.error
          ? extractResult.error
          : createAppError('PAGE_INACCESSIBLE');
      }

      const result = await taskOrchestrator.ask(id, extractResult.page, q, {
        providerId: preferences.defaultProviderId,
        onEvent: (event) => {
          if (event.type === 'token' && event.text) {
            setStreaming((prev) => prev + event.text);
          }
          if (event.type === 'done' && event.fullText) {
            setStreaming(event.fullText);
          }
        },
      });

      setTurns((prev) => [
        ...prev,
        { question: q, answer: result.text, citations: result.citations },
      ]);
      setStreaming('');
      setQuestion('');
      setReceipt(result.receipt);
    } catch (err) {
      setError(isAppError(err) ? err : createAppError('UNKNOWN', { cause: String(err) }));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="stack">
      <div className="card stack">
        <h2>Ask this page</h2>
        <p className="muted">
          Retrieves relevant passages locally, then asks the model. Answers include
          jump-back sources. No tool permissions.
        </p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the current page…"
          aria-label="Question"
          disabled={running}
        />
        <div className="row">
          <button
            type="button"
            className="btn primary"
            disabled={running || !question.trim()}
            onClick={() => void ask()}
          >
            Ask
          </button>
          <button type="button" className="btn" disabled={!running} onClick={stop}>
            Stop
          </button>
        </div>
      </div>

      {error && <ErrorBox error={error} />}

      {running && streaming && (
        <div className="card">
          <div className="stream" aria-live="polite">
            {streaming}
          </div>
        </div>
      )}

      {turns.map((turn, i) => (
        <div className="card stack" key={`${turn.question}-${i}`}>
          <div>
            <strong>Q:</strong> {turn.question}
          </div>
          <div className="stream">{turn.answer}</div>
          <Citations citations={turn.citations} />
        </div>
      ))}

      {receipt && <PrivacyReceiptView receipt={receipt} />}
    </div>
  );
}
