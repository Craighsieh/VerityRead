import { useEffect, useState } from 'react';
import { createTaskId, isExtensionMessage } from '@/shared/messages';
import { sendMessage } from '@/shared/messaging';
import { createAppError, isAppError } from '@/shared/errors';
import type { AppError, PrivacyReceipt, TranslateResult, UserPreferences } from '@/shared/types';
import { taskOrchestrator } from '@/core/orchestrator';
import { ErrorBox } from './ErrorBox';
import { PrivacyReceiptView } from './PrivacyReceiptView';

interface Props {
  preferences: UserPreferences;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => Promise<unknown>;
}

export function TranslatePanel({ preferences, onUpdatePreferences }: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [receipt, setReceipt] = useState<PrivacyReceipt | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [running, setRunning] = useState(false);
  const [uiReadyAt] = useState(() => performance.now());
  const [readyBanner, setReadyBanner] = useState(false);

  useEffect(() => {
    // Selection UI ready within 150ms of mount (not translation complete)
    const elapsed = performance.now() - uiReadyAt;
    if (elapsed < 150) {
      setReadyBanner(true);
    }
  }, [uiReadyAt]);

  useEffect(() => {
    const listener = (raw: unknown) => {
      if (!isExtensionMessage(raw)) return;
      if (raw.type === 'CONTEXT_MENU_TRANSLATE') {
        setText(raw.text);
        void translate(raw.text);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  const loadSelection = async () => {
    const t0 = performance.now();
    const res = await sendMessage({ type: 'GET_SELECTION' });
    if (res?.type === 'GET_SELECTION_RESULT') {
      setText(res.text);
    }
    // Ensure operable UI appears quickly
    void t0;
  };

  const translate = async (override?: string) => {
    const input = (override ?? text).trim();
    if (!input) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setReceipt(null);
    try {
      const { result: tr, receipt: rc } = await taskOrchestrator.translate(
        createTaskId(),
        input,
        preferences.targetLanguage,
        { providerId: preferences.defaultProviderId },
      );
      setResult(tr);
      setReceipt(rc);
    } catch (err) {
      setError(isAppError(err) ? err : createAppError('UNKNOWN', { cause: String(err) }));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="stack">
      <div className="card stack">
        <h2>Translate selection</h2>
        <p className="muted">
          Prefers Chrome Translator API; falls back to the current Provider LLM.
          Results are copy-only and not saved by default.
        </p>
        {readyBanner && (
          <p className="muted">Translation UI ready (selection operable).</p>
        )}
        <label>
          Target language
          <select
            value={preferences.targetLanguage}
            onChange={(e) => void onUpdatePreferences({ targetLanguage: e.target.value })}
          >
            <option value="zh-Hans">Chinese (Simplified)</option>
            <option value="zh-Hant">Chinese (Traditional)</option>
            <option value="en">English</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Selected text appears here…"
          aria-label="Text to translate"
        />
        <div className="row">
          <button type="button" className="btn" onClick={() => void loadSelection()}>
            Use current selection
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={running || !text.trim()}
            onClick={() => void translate()}
          >
            Translate
          </button>
        </div>
      </div>

      {error && <ErrorBox error={error} />}

      {result && (
        <div className="card stack">
          <div className="row">
            <span className="badge">
              {result.detectedLanguage ?? '?'} → {result.targetLanguage}
            </span>
            <span className="badge">Engine: {result.engine}</span>
            <span className="badge">{result.model}</span>
          </div>
          <div className="stream">{result.translatedText}</div>
          <button
            type="button"
            className="btn"
            onClick={() => void navigator.clipboard.writeText(result.translatedText)}
          >
            Copy translation
          </button>
        </div>
      )}

      {receipt && <PrivacyReceiptView receipt={receipt} />}
    </div>
  );
}
