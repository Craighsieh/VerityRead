import { useEffect, useRef, useState } from 'react';
import { probeChromeAvailability } from '@/providers/chromeBuiltin';
import { OllamaProvider } from '@/providers/ollama';
import {
  getOllamaModelDescriptors,
  isOllamaModelReady,
  recommendOllamaModel,
} from '@/providers/modelRecommendation';
import type {
  Availability,
  ProviderId,
  ProviderStatus,
  UserPreferences,
} from '@/shared/types';
import { CURRENT_PRIVACY_CONSENT_VERSION } from '@/shared/types';
import { ErrorBox } from './ErrorBox';
import { createAppError } from '@/shared/errors';
import { getOllamaModels, OllamaStatusCard } from './OllamaStatusCard';
import { OllamaSetupLink } from './OllamaSetupGuide';
import { t, type MessageKey } from '@/i18n';

interface Props {
  preferences: UserPreferences;
  onComplete: (patch: Partial<UserPreferences>) => Promise<unknown>;
}

type Step = 'privacy' | 'capabilities' | 'provider' | 'done';

function AvailabilityBadge({ value }: { value: Availability }) {
  const cls = value === 'available' ? 'ok' : value === 'unavailable' ? 'bad' : 'warn';
  const labelKey = (value === 'unavailable' ? 'unavailable' : value) as MessageKey;
  return (
    <span className="row">
      <span className={`status-dot ${cls}`} />
      <span className="badge">{t(labelKey)}</span>
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
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const capabilityCheckId = useRef(0);

  const runCapabilityCheck = async (model = ollamaModel) => {
    const checkId = ++capabilityCheckId.current;
    setChecking(true);
    setError(null);
    const started = performance.now();
    try {
      const chrome = await probeChromeAvailability();
      if (checkId !== capabilityCheckId.current) return;
      setChromeAvail(chrome);
      const ollama = new OllamaProvider({
        baseUrl: preferences.ollamaBaseUrl,
        model,
      });
      const status = await ollama.healthCheck();
      if (checkId !== capabilityCheckId.current) return;
      setOllamaStatus(status);
      // Prefer keeping preliminary results under 2s perception; already async
      void started;
    } catch (err) {
      if (checkId !== capabilityCheckId.current) return;
      setError(
        createAppError('UNKNOWN', {
          cause: err instanceof Error ? err.message : String(err),
        }),
      );
    } finally {
      if (checkId === capabilityCheckId.current) {
        setChecking(false);
      }
    }
  };

  useEffect(() => {
    if (step === 'capabilities') {
      void runCapabilityCheck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const finish = async () => {
    const selectedOllamaModel = ollamaModel || ollamaStatus?.model || '';
    const providerReady =
      providerId === 'chrome-builtin'
        ? chromeAvail?.languageModel === 'available'
        : isOllamaModelReady(ollamaStatus, selectedOllamaModel);
    if (!providerReady) {
      setError(
        createAppError('MODEL_UNAVAILABLE', {
          message: t('setupNeedsReady'),
        }),
      );
      return;
    }
    await onComplete({
      defaultProviderId: providerId,
      ollamaModel: selectedOllamaModel,
      privacyConsentVersion: CURRENT_PRIVACY_CONSENT_VERSION,
      onboardingComplete: true,
    });
    setStep('done');
  };
  const ollamaModels = getOllamaModels(ollamaStatus);
  const modelDescriptors = getOllamaModelDescriptors(ollamaStatus);
  const recommendation = recommendOllamaModel(modelDescriptors);
  const selectedOllamaModel = ollamaModel || ollamaStatus?.model || '';
  const providerReady =
    providerId === 'chrome-builtin'
      ? chromeAvail?.languageModel === 'available'
      : isOllamaModelReady(ollamaStatus, selectedOllamaModel);

  return (
    <div className="stack">
      <div className="card">
        <h2>{t('welcomeTitle')}</h2>
        <p className="muted">{t('welcomeBody')}</p>
      </div>

      {step === 'privacy' && (
        <div className="card stack">
          <h3>{t('privacyPromise')}</h3>
          <ul>
            <li>{t('privacyPromiseOne')}</li>
            <li>{t('privacyPromiseTwo')}</li>
            <li>{t('privacyPromiseThree')}</li>
          </ul>
          <label className="row">
            <input
              type="checkbox"
              checked={privacyConsent}
              onChange={(event) => setPrivacyConsent(event.target.checked)}
            />
            <span>{t('privacyConsent')}</span>
          </label>
          <a
            href="https://craighsieh.github.io/VerityRead/privacy/"
            target="_blank"
            rel="noreferrer"
          >
            {t('privacyPolicy')}
          </a>
          <button
            type="button"
            className="btn primary"
            disabled={!privacyConsent}
            onClick={() => setStep('capabilities')}
          >
            {t('runCapabilityCheck')}
          </button>
        </div>
      )}

      {step === 'capabilities' && (
        <div className="card stack">
          <h3>{t('deviceCapabilityCheck')}</h3>
          <p className="muted">{t('capabilityCheckBody')}</p>
          {checking && <p>{t('checking')}…</p>}
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
                  {chromeAvail.webgpu ? t('presentDisplayOnly') : t('missing')}
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
              {t('recheck')}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => setStep('provider')}
            >
              {t('chooseProvider')}
            </button>
          </div>
        </div>
      )}

      {step === 'provider' && (
        <div className="card stack">
          <h3>{t('chooseDefaultProvider')}</h3>
          <p className="muted">{t('providerChoiceBody')}</p>
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
          <div className="setup-callout stack">
            <strong>{t('ollamaOptionalTitle')}</strong>
            <span className="muted">{t('ollamaOptionalBody')}</span>
            <OllamaSetupLink />
          </div>

          {providerId === 'ollama' && (
            <div className="stack">
              <label>
                {t('modelName')}
                {ollamaModels.length > 0 ? (
                  <select
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                  >
                    <option value="">{t('chooseInstalledModel')}</option>
                    {ollamaModel && !ollamaModels.includes(ollamaModel) && (
                      <option value={ollamaModel}>
                        {ollamaModel} ({t('notInstalled')})
                      </option>
                    )}
                    {modelDescriptors.map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.name}
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
                    <strong>
                      {t('recommended', { model: recommendation.model.name })}
                    </strong>
                    <span className="muted">{t('modelRecommendationReason')}</span>
                  </div>
                  {ollamaModel !== recommendation.model.name && (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setOllamaModel(recommendation.model.name)}
                    >
                      {t('useRecommended')}
                    </button>
                  )}
                </div>
              )}
              <button
                type="button"
                className="btn"
                onClick={() => void runCapabilityCheck(ollamaModel)}
              >
                {t('connectionTest')}
              </button>
              <OllamaStatusCard status={ollamaStatus} checking={checking} />
            </div>
          )}

          {providerId === 'chrome-builtin' &&
            chromeAvail?.languageModel === 'unavailable' && (
              <ErrorBox
                error={createAppError('MODEL_UNAVAILABLE', {
                  message: `${t('unavailable')}: Chrome Built-in AI`,
                })}
              />
            )}

          {!providerReady && (
            <p className="muted" role="status">
              {t('setupNeedsReady')}
            </p>
          )}
          <button
            type="button"
            className="btn primary"
            disabled={!providerReady || checking}
            onClick={() => void finish()}
          >
            {t('finishSetup')}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="card">
          <p>{t('setupComplete')}</p>
        </div>
      )}
    </div>
  );
}
