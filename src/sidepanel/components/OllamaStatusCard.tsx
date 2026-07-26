import { createAppError } from '@/shared/errors';
import type { ProviderStatus } from '@/shared/types';
import { ErrorBox } from './ErrorBox';
import { t, type MessageKey } from '@/i18n';
import { OllamaSetupGuide, OllamaSetupLink } from './OllamaSetupGuide';

type Platform = 'macos' | 'windows' | 'linux';

function detectPlatform(): Platform {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('windows')) return 'windows';
  if (userAgent.includes('linux')) return 'linux';
  return 'macos';
}

function extensionId(): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.id
    ? chrome.runtime.id
    : 'YOUR_EXTENSION_ID';
}

export function getOllamaModels(status: ProviderStatus | null): string[] {
  const models = status?.details?.models;
  return Array.isArray(models)
    ? models.filter((model): model is string => typeof model === 'string')
    : [];
}

export function OllamaStatusCard({
  status,
  checking = false,
}: {
  status: ProviderStatus | null;
  checking?: boolean;
}) {
  if (checking) {
    return (
      <div className="connection-status" role="status">
        <span className="status-dot warn" />
        {t('ollamaChecking')}
      </div>
    );
  }

  if (!status) return null;

  const models = getOllamaModels(status);
  if (status.healthy) {
    return (
      <div className="connection-status stack" role="status">
        <div className="row">
          <span className="status-dot ok" />
          <strong>{t('ollamaConnected')}</strong>
          <span className="badge">{t(status.availability as MessageKey)}</span>
        </div>
        {status.model && (
          <span className="muted">{t('selectedModel', { model: status.model })}</span>
        )}
        {models.length > 0 && (
          <span className="muted">
            {t('installedModels', { models: models.join(', ') })}
          </span>
        )}
      </div>
    );
  }

  const error = createAppError(status.errorCode ?? 'PROVIDER_UNHEALTHY', {
    cause: status.message,
  });
  const platform = detectPlatform();
  const runtimeId = extensionId();
  const platformLabel =
    platform === 'macos' ? 'macOS' : platform === 'windows' ? 'Windows' : 'Linux';
  const corsSteps =
    platform === 'macos'
      ? t('corsMacSteps')
      : platform === 'windows'
        ? t('corsWindowsSteps')
        : t('corsLinuxSteps');
  const corsCommand =
    platform === 'macos'
      ? `launchctl setenv OLLAMA_ORIGINS "chrome-extension://${runtimeId}"`
      : platform === 'windows'
        ? `setx OLLAMA_ORIGINS "chrome-extension://${runtimeId}"`
        : `export OLLAMA_ORIGINS="chrome-extension://${runtimeId}"`;

  return (
    <div className="stack">
      <ErrorBox error={error} />
      {status.errorCode === 'OLLAMA_CORS' && (
        <div className="connection-status stack">
          <strong>{t('corsSetup', { platform: platformLabel })}</strong>
          <span>{corsSteps}</span>
          <code>{corsCommand}</code>
          <span className="muted">
            {t('extensionId')}: <code>{runtimeId}</code>
          </span>
          <OllamaSetupLink />
        </div>
      )}
      {(status.errorCode === 'OLLAMA_UNREACHABLE' ||
        (status.errorCode === 'MODEL_UNAVAILABLE' && models.length === 0)) && (
        <OllamaSetupGuide />
      )}
      {models.length > 0 && (
        <div className="connection-status">
          {t('installedModels', { models: models.join(', ') })}
        </div>
      )}
    </div>
  );
}
