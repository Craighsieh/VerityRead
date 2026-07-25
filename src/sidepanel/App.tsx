import { useEffect, useMemo, useState } from 'react';
import { providerRegistry } from '@/providers/registry';
import type { PrivacyReceipt, ProviderStatus } from '@/shared/types';
import { usePreferences } from './hooks/usePreferences';
import { Onboarding } from './components/Onboarding';
import { ChatPanel } from './components/ChatPanel';
import { PrivacyCenter } from './components/PrivacyCenter';
import { SettingsPanel } from './components/SettingsPanel';
import { SpikeLabs } from './components/SpikeLabs';
import { productName, t } from '@/i18n';

type DrawerId = 'privacy' | 'settings' | null;

export function App() {
  const { preferences, loading, update } = usePreferences();
  const [drawer, setDrawer] = useState<DrawerId>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [checkingProvider, setCheckingProvider] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<PrivacyReceipt | null>(null);

  const providerLabel = useMemo(() => {
    return preferences.defaultProviderId === 'ollama'
      ? `Ollama${preferences.ollamaModel ? ` · ${preferences.ollamaModel}` : ''}`
      : 'Chrome Built-in AI';
  }, [preferences.defaultProviderId, preferences.ollamaModel]);

  useEffect(() => {
    let active = true;
    setCheckingProvider(true);
    setProviderStatus(null);
    void providerRegistry
      .init()
      .then(() => providerRegistry.get(preferences.defaultProviderId).healthCheck())
      .then((status) => {
        if (active) setProviderStatus(status);
      })
      .catch(() => {
        if (active) setProviderStatus(null);
      })
      .finally(() => {
        if (active) setCheckingProvider(false);
      });
    return () => {
      active = false;
    };
  }, [preferences.defaultProviderId, preferences.ollamaBaseUrl, preferences.ollamaModel]);

  useEffect(() => {
    if (!drawer) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [drawer]);

  if (loading) {
    return (
      <div className="app">
        <div className="content">{t('loading')}</div>
      </div>
    );
  }

  if (!preferences.onboardingComplete) {
    return (
      <div className="app">
        <header className="header">
          <div className="brand">
            <strong>{productName()}</strong>
            <span className="muted">{t('tagline')}</span>
          </div>
        </header>
        <main className="content">
          <Onboarding preferences={preferences} onComplete={update} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <strong>{productName()}</strong>
          <span className="muted">{t('pageContentStaysLocal')}</span>
        </div>
        <div className="header-controls">
          <div
            className="provider-chip"
            title={
              providerStatus?.message ??
              (checkingProvider
                ? t('providerChecking')
                : providerStatus?.healthy
                  ? t('providerReady')
                  : t('providerUnavailable'))
            }
          >
            <span
              className={`status-dot ${
                checkingProvider ? 'warn' : providerStatus?.healthy ? 'ok' : 'bad'
              }`}
            />
            <span>{providerLabel}</span>
            <span className="provider-state">
              {checkingProvider
                ? t('checking')
                : providerStatus?.healthy
                  ? t('ready')
                  : t('unavailable')}
            </span>
          </div>
          <button
            type="button"
            className="header-button"
            onClick={() => setDrawer('privacy')}
          >
            {t('privacy')}
          </button>
          <button
            type="button"
            className="header-button"
            onClick={() => setDrawer('settings')}
          >
            {t('settings')}
          </button>
        </div>
      </header>

      <main className="app-main">
        <ChatPanel
          preferences={preferences}
          onUpdatePreferences={update}
          onReceipt={setLastReceipt}
        />
      </main>

      {drawer && (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDrawer(null);
          }}
        >
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={drawer === 'privacy' ? t('privacy') : t('settings')}
          >
            <div className="drawer-header">
              <strong>{drawer === 'privacy' ? t('privacy') : t('settings')}</strong>
              <button
                type="button"
                className="header-button"
                onClick={() => setDrawer(null)}
                aria-label={t('close')}
              >
                {t('close')}
              </button>
            </div>
            <div className="drawer-body">
              {drawer === 'privacy' ? (
                <PrivacyCenter
                  preferences={preferences}
                  onUpdate={update}
                  lastReceiptSummary={
                    lastReceipt
                      ? `${lastReceipt.taskType} · ${lastReceipt.providerId}/${lastReceipt.model} · ${t('cloudInferenceFalse')}`
                      : undefined
                  }
                />
              ) : (
                <>
                  <SettingsPanel preferences={preferences} onUpdate={update} />
                  {import.meta.env.DEV && (
                    <details className="diagnostics">
                      <summary>{t('diagnostics')}</summary>
                      <SpikeLabs />
                    </details>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
