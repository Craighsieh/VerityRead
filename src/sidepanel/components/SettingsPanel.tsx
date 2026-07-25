import { useEffect, useState } from 'react';
import { isAppError, createAppError } from '@/shared/errors';
import { OllamaProvider } from '@/providers/ollama';
import {
  getOllamaModelDescriptors,
  modelChoiceLabel,
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

interface Props {
  preferences: UserPreferences;
  onUpdate: (patch: Partial<UserPreferences>) => Promise<unknown>;
}

export function SettingsPanel({ preferences, onUpdate }: Props) {
  const [ollamaStatus, setOllamaStatus] = useState<ProviderStatus | null>(null);
  const [checkingOllama, setCheckingOllama] = useState(false);
  const [connectionError, setConnectionError] = useState<AppError | null>(null);

  const checkOllama = async (
    model = preferences.ollamaModel,
    baseUrl = preferences.ollamaBaseUrl,
  ) => {
    setCheckingOllama(true);
    setConnectionError(null);
    try {
      const provider = new OllamaProvider({ baseUrl, model });
      setOllamaStatus(await provider.healthCheck());
    } catch (err) {
      setOllamaStatus(null);
      setConnectionError(
        isAppError(err)
          ? err
          : createAppError('UNKNOWN', {
              cause: err instanceof Error ? err.message : String(err),
            }),
      );
    } finally {
      setCheckingOllama(false);
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
      <div className="card stack">
        <h2>Settings</h2>
        <label>
          Default Provider
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
              Ollama model
              {models.length > 0 ? (
                <select
                  value={preferences.ollamaModel}
                  onChange={(e) => void updateModel(e.target.value)}
                >
                  <option value="">Choose an installed model</option>
                  {preferences.ollamaModel &&
                    !models.includes(preferences.ollamaModel) && (
                      <option value={preferences.ollamaModel}>
                        {preferences.ollamaModel} (not installed)
                      </option>
                    )}
                  {modelDescriptors.map((model) => (
                    <option key={model.name} value={model.name}>
                      {modelChoiceLabel(model, recommendation)}
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
                  <strong>Recommended: {recommendation.model.name}</strong>
                  <span className="muted">{recommendation.reason}</span>
                </div>
                {preferences.ollamaModel !== recommendation.model.name && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void updateModel(recommendation.model.name)}
                  >
                    Use recommended
                  </button>
                )}
              </div>
            )}
            <label>
              Ollama base URL (loopback only)
              <input
                value={preferences.ollamaBaseUrl}
                onChange={(e) => {
                  setOllamaStatus(null);
                  void onUpdate({ ollamaBaseUrl: e.target.value });
                }}
              />
            </label>
            <div className="row">
              <button
                type="button"
                className="btn"
                disabled={checkingOllama}
                onClick={() => void checkOllama()}
              >
                {checkingOllama ? 'Testing…' : 'Test Ollama connection'}
              </button>
              <span className="muted">
                Checks <code>/api/tags</code>; sends no page content.
              </span>
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
          Cache summaries locally
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={preferences.historyEnabled}
            onChange={(e) => void onUpdate({ historyEnabled: e.target.checked })}
          />
          Enable local history (off by default)
        </label>
        <p className="muted">
          Current Provider is always visible in the header. No silent fallback.
        </p>
      </div>
    </div>
  );
}
