import { createAppError } from '@/shared/errors';
import type { ProviderStatus } from '@/shared/types';
import { OLLAMA_CORS_GUIDE } from '@/providers/ollama';
import { ErrorBox } from './ErrorBox';

type Platform = keyof typeof OLLAMA_CORS_GUIDE;

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
        Checking Ollama on loopback…
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
          <strong>Ollama connected</strong>
          <span className="badge">{status.availability}</span>
        </div>
        {status.model && <span className="muted">Selected model: {status.model}</span>}
        {models.length > 0 && (
          <span className="muted">Installed: {models.join(', ')}</span>
        )}
      </div>
    );
  }

  const error = createAppError(status.errorCode ?? 'PROVIDER_UNHEALTHY', {
    cause: status.message,
  });
  const platform = detectPlatform();
  const runtimeId = extensionId();

  return (
    <div className="stack">
      <ErrorBox error={error} />
      {status.errorCode === 'OLLAMA_CORS' && (
        <div className="connection-status stack">
          <strong>CORS setup ({platform})</strong>
          <ol>
            {OLLAMA_CORS_GUIDE[platform].map((line) => (
              <li key={line}>
                <code>{line.replace('YOUR_EXTENSION_ID', runtimeId)}</code>
              </li>
            ))}
          </ol>
          <span className="muted">
            Extension ID: <code>{runtimeId}</code>
          </span>
        </div>
      )}
      {models.length > 0 && (
        <div className="connection-status">Installed models: {models.join(', ')}</div>
      )}
    </div>
  );
}
