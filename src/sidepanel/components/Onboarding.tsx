import { useEffect, useState } from 'react';
import { probeChromeAvailability } from '@/providers/chromeBuiltin';
import { OllamaProvider } from '@/providers/ollama';
import {
  getOllamaModelDescriptors,
  modelChoiceLabel,
  recommendOllamaModel,
} from '@/providers/modelRecommendation';
import type {
  Availability,
  ProviderId,
  ProviderStatus,
  UserPreferences,
} from '@/shared/types';
import { ErrorBox } from './ErrorBox';
import { createAppError } from '@/shared/errors';
import { getOllamaModels, OllamaStatusCard } from './OllamaStatusCard';

interface Props {
  preferences: UserPreferences;
  onComplete: (patch: Partial<UserPreferences>) => Promise<unknown>;
}

type Step = 'privacy' | 'capabilities' | 'provider' | 'done';

function AvailabilityBadge({ value }: { value: Availability }) {
  const cls = value === 'available' ? 'ok' : value === 'unavailable' ? 'bad' : 'warn';
  return (
    <span className="row">
      <span className={`status-dot ${cls}`} />
      <span className="badge">{value}</span>
    </span>
  );
}

export function Onboarding({ preferences, onComplete }: Props) {
  const [step, setStep] = useState<Step>('privacy');
  const [chromeAvail, setChromeAvail] = useState<{
    languageModel: Availability;
    summarizer: Availability;
    translator: Availability;
    webgpu: boolean;
  } | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<ProviderStatus | null>(null);
  const [providerId, setProviderId] = useState<ProviderId>(preferences.defaultProviderId);
  const [ollamaModel, setOllamaModel] = useState(preferences.ollamaModel);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<ReturnType<typeof createAppError> | null>(null);

  const runCapabilityCheck = async () => {
    setChecking(true);
    setError(null);
    const started = performance.now();
    try {
      const chrome = await probeChromeAvailability();
      setChromeAvail(chrome);
      const ollama = new OllamaProvider({
        baseUrl: preferences.ollamaBaseUrl,
        model: ollamaModel,
      });
      const status = await ollama.healthCheck();
      setOllamaStatus(status);
      // Prefer keeping preliminary results under 2s perception; already async
      void started;
    } catch (err) {
      setError(
        createAppError('UNKNOWN', {
          cause: err instanceof Error ? err.message : String(err),
        }),
      );
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (step === 'capabilities') {
      void runCapabilityCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const finish = async () => {
    await onComplete({
      defaultProviderId: providerId,
      ollamaModel,
      onboardingComplete: true,
    });
    setStep('done');
  };
  const ollamaModels = getOllamaModels(ollamaStatus);
  const modelDescriptors = getOllamaModelDescriptors(ollamaStatus);
  const recommendation = recommendOllamaModel(modelDescriptors);

  return (
    <div className="stack">
      <div className="card">
        <h2>Welcome to VaultLens</h2>
        <p className="muted">
          Privacy-first local AI assistant. Page content is never sent to cloud inference
          by default.
        </p>
      </div>

      {step === 'privacy' && (
        <div className="card stack">
          <h3>Privacy promise (verifiable)</h3>
          <ul>
            <li>
              Page content, selections, prompts, and AI replies are not sent to cloud
              inference services by default.
            </li>
            <li>
              Model downloads, extension updates, and license checks may use the network —
              fully isolated from page data.
            </li>
            <li>We only read the current tab after you click a feature.</li>
          </ul>
          <button
            type="button"
            className="btn primary"
            onClick={() => setStep('capabilities')}
          >
            Run device capability check
          </button>
        </div>
      )}

      {step === 'capabilities' && (
        <div className="card stack">
          <h3>Device capability check</h3>
          <p className="muted">
            Does not read the current page. Preliminary results appear quickly; download
            states may update later.
          </p>
          {checking && <p>Checking…</p>}
          {chromeAvail && (
            <div className="stack">
              <div className="row">
                LanguageModel <AvailabilityBadge value={chromeAvail.languageModel} />
              </div>
              <div className="row">
                Summarizer <AvailabilityBadge value={chromeAvail.summarizer} />
              </div>
              <div className="row">
                Translator <AvailabilityBadge value={chromeAvail.translator} />
              </div>
              <div className="row">
                WebGPU{' '}
                <span className="badge">
                  {chromeAvail.webgpu ? 'present (MVP: display only)' : 'missing'}
                </span>
              </div>
            </div>
          )}
          <OllamaStatusCard status={ollamaStatus} checking={checking} />
          {error && <ErrorBox error={error} />}
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => void runCapabilityCheck()}
            >
              Re-check
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => setStep('provider')}
            >
              Choose Provider
            </button>
          </div>
        </div>
      )}

      {step === 'provider' && (
        <div className="card stack">
          <h3>Choose default Provider</h3>
          <p className="muted">
            UI always shows the active Provider. VaultLens never switches without your
            action.
          </p>
          <label className="row">
            <input
              type="radio"
              name="provider"
              checked={providerId === 'chrome-builtin'}
              onChange={() => setProviderId('chrome-builtin')}
            />
            Chrome Built-in AI
          </label>
          <label className="row">
            <input
              type="radio"
              name="provider"
              checked={providerId === 'ollama'}
              onChange={() => setProviderId('ollama')}
            />
            Ollama (127.0.0.1:11434)
          </label>

          {providerId === 'ollama' && (
            <div className="stack">
              <label>
                Model name
                {ollamaModels.length > 0 ? (
                  <select
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                  >
                    <option value="">Choose an installed model</option>
                    {ollamaModel && !ollamaModels.includes(ollamaModel) && (
                      <option value={ollamaModel}>{ollamaModel} (not installed)</option>
                    )}
                    {modelDescriptors.map((model) => (
                      <option key={model.name} value={model.name}>
                        {modelChoiceLabel(model, recommendation)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="e.g. llama3.2"
                  />
                )}
              </label>
              {recommendation && (
                <div className="model-recommendation">
                  <div>
                    <strong>Recommended: {recommendation.model.name}</strong>
                    <span className="muted">{recommendation.reason}</span>
                  </div>
                  {ollamaModel !== recommendation.model.name && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setOllamaModel(recommendation.model.name)}
                    >
                      Use recommended
                    </button>
                  )}
                </div>
              )}
              <button
                type="button"
                className="btn"
                onClick={() => void runCapabilityCheck()}
              >
                Connection test
              </button>
              <OllamaStatusCard status={ollamaStatus} checking={checking} />
            </div>
          )}

          {providerId === 'chrome-builtin' &&
            chromeAvail?.languageModel === 'unavailable' && (
              <ErrorBox
                error={createAppError('MODEL_UNAVAILABLE', {
                  message:
                    'Chrome Built-in AI is unavailable. Use Ollama or enable Gemini Nano / Built-in AI flags on a supported Chrome channel.',
                })}
              />
            )}

          <button type="button" className="btn primary" onClick={() => void finish()}>
            Finish setup
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="card">
          <p>
            Setup complete. Open a normal webpage and try <strong>Summarize</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
