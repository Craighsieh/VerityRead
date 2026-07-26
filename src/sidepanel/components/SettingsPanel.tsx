import { useEffect, useRef, useState } from 'react';
import { isAppError, createAppError } from '@/shared/errors';
import { OllamaProvider } from '@/providers/ollama';
import {
  getOllamaModelDescriptors,
  recommendOllamaModel,
} from '@/providers/modelRecommendation';
import type {
  AppError,
  ProviderId,
  ProviderStatus,
  UserPreferences,
} from '@/shared/types';
import { ErrorBox } from './ErrorBox';
import { getOllamaModels, OllamaStatusCard } from './OllamaStatusCard';
import { OllamaSetupLink } from './OllamaSetupGuide';
import { SiteAccessCard } from './SiteAccessCard';
import { t } from '@/i18n';

interface Props {
  preferences: UserPreferences;
  onUpdate: (patch: Partial<UserPreferences>) => Promise<unknown>;
}

export function SettingsPanel({ preferences, onUpdate }: Props) {
  const [ollamaStatus, setOllamaStatus] = useState<ProviderStatus | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [connectionError, setConnectionError] = useState<AppError | null>(null);
  const connectionCheckId = useRef(0);

  const checkOllama = async (model = preferences.ollamaModel) => {
    const checkId = ++connectionCheckId.current;
    setCheckingOllama(true);
    setConnectionError(null);
    try {
      const provider = new OllamaProvider({ model });
      const status = await provider.healthCheck();
      if (checkId !== connectionCheckId.current) return;
      setOllamaStatus(status);
    } catch (err) {
      if (checkId !== connectionCheckId.current) return;
      setOllamaStatus(null);
      setConnectionError(
        isAppError(err)
          ? err
          : createAppError('UNKNOWN', {
              cause: err instanceof Error ? err.message : String(err),
            }),
      );
    } finally {
      if (checkId === connectionCheckId.current) {
        setCheckingOllama(false);
      }
    }
  };

  useEffect(() => {
    if (preferences.defaultProviderId === 'ollama') {
      void checkOllama();
    }
    // Check once on entry; explicit changes use the handlers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProvider = async (providerId: ProviderId) => {
    connectionCheckId.current += 1;
    setCheckingOllama(false);
    await onUpdate({ defaultProviderId: providerId });
    if (providerId === 'ollama') {
      await checkOllama();
    }
  };

  const updateModel = async (ollamaModel: string) => {
    await onUpdate({ ollamaModel });
    await checkOllama(ollamaModel);
  };

  const models = getOllamaModels(ollamaStatus);
  const modelDescriptors = getOllamaModelDescriptors(ollamaStatus);
  const recommendation = recommendOllamaModel(modelDescriptors);

  return (
    <div className="stack">
      <SiteAccessCard />
      <div className="card stack">
        <h2>{t('settings')}</h2>
        <label>
          {t('defaultProvider')}
          <select
            value={preferences.defaultProviderId}
            onChange={(e) => void updateProvider(e.target.value as ProviderId)}
          >
            <option value="chrome-builtin">Chrome Built-in AI</option>
            <option value="ollama">Ollama</option>
          </select>
        </label>
        {preferences.defaultProviderId === 'ollama' && (
          <div className="stack">
            <label>
              {t('ollamaModel')}
              {models.length > 0 ? (
                <select
                  value={preferences.ollamaModel}
                  onChange={(e) => void updateModel(e.target.value)}
                >
                  <option value="">{t('chooseInstalledModel')}</option>
                  {preferences.ollamaModel &&
                    !models.includes(preferences.ollamaModel) && (
                      <option value={preferences.ollamaModel}>
                        {preferences.ollamaModel} ({t('notInstalled')})
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
                  value={preferences.ollamaModel}
                  onChange={(e) => void onUpdate({ ollamaModel: e.target.value })}
                  placeholder="llama3.2"
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
                {preferences.ollamaModel !== recommendation.model.name && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void updateModel(recommendation.model.name)}
                  >
                    {t('useRecommended')}
                  </button>
                )}
              </div>
            )}
            <div>
              {t('ollamaEndpoint')}: <code>http://127.0.0.1:11434</code>
            </div>
            <OllamaSetupLink />
            <p className="muted">{t('customEndpointDeferred')}</p>
            <div className="row">
              <button
                type="button"
                className="btn"
                disabled={checkingOllama}
                onClick={() => void checkOllama()}
              >
                {checkingOllama ? t('testing') : t('testOllama')}
              </button>
              <span className="muted">{t('healthCheckNoContent')}</span>
            </div>
            {connectionError && <ErrorBox error={connectionError} />}
            <OllamaStatusCard status={ollamaStatus} checking={checkingOllama} />
          </div>
        )}
        <label className="row">
          <input
            type="checkbox"
            checked={preferences.cacheSummaries}
            onChange={(e) => void onUpdate({ cacheSummaries: e.target.checked })}
          />
          {t('cacheSummaries')}
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={preferences.historyEnabled}
            onChange={(e) => void onUpdate({ historyEnabled: e.target.checked })}
          />
          {t('enableHistory')}
        </label>
        <p className="muted">{t('noSilentFallback')}</p>
      </div>
    </div>
  );
}
