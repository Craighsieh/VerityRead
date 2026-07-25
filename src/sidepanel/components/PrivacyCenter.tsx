import { useState } from 'react';
import { ALLOWED_NETWORK_DESTINATIONS, type UserPreferences } from '@/shared/types';
import { clearAllLocalData, clearHistory, clearSummaryCache } from '@/storage';
import { setPreferences } from '@/storage/preferences';
import { t } from '@/i18n';

interface Props {
  preferences: UserPreferences;
  onUpdate: (patch: Partial<UserPreferences>) => Promise<unknown>;
  lastReceiptSummary?: string;
}

export function PrivacyCenter({ preferences, onUpdate, lastReceiptSummary }: Props) {
  const [status, setStatus] = useState('');

  const clear = async (scope: 'cache' | 'history' | 'all') => {
    if (scope === 'cache') await clearSummaryCache();
    if (scope === 'history') await clearHistory();
    if (scope === 'all') {
      await clearAllLocalData();
      await setPreferences({ onboardingComplete: preferences.onboardingComplete });
    }
    setStatus(t('cleared', { scope }));
  };

  return (
    <div className="stack">
      <div className="card stack">
        <h2>{t('privacyCenter')}</h2>
        <p className="muted">{t('privacyCenterBody')}</p>
        <a
          href="https://craighsieh.github.io/VerityRead/privacy/"
          target="_blank"
          rel="noreferrer"
        >
          {t('privacyPolicy')}
        </a>
        <div>
          {t('defaultProvider')}: <code>{preferences.defaultProviderId}</code>
        </div>
        <div>
          {t('offlineLock')}:{' '}
          <strong>{preferences.offlineLock ? t('on') : t('offDefault')}</strong>
        </div>
        <div>
          {t('history')}:{' '}
          <strong>{preferences.historyEnabled ? t('on') : t('offDefault')}</strong>
        </div>
        {lastReceiptSummary && (
          <p className="muted">
            {t('lastTask', { summary: lastReceiptSummary })}
          </p>
        )}
      </div>

      <div className="card stack">
        <h3>{t('offlineLock')}</h3>
        <p className="muted">{t('offlineLockBody')}</p>
        <label className="row">
          <input
            type="checkbox"
            checked={preferences.offlineLock}
            onChange={(e) => void onUpdate({ offlineLock: e.target.checked })}
          />
          {t('enableOfflineLock')}
        </label>
      </div>

      <div className="card stack">
        <h3>{t('allowedDestinations')}</h3>
        <ul>
          {ALLOWED_NETWORK_DESTINATIONS.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>

      <div className="card stack">
        <h3>{t('clearLocalData')}</h3>
        <div className="row">
          <button type="button" className="btn" onClick={() => void clear('cache')}>
            {t('clearCache')}
          </button>
          <button type="button" className="btn" onClick={() => void clear('history')}>
            {t('clearHistory')}
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => void clear('all')}
          >
            {t('clearAll')}
          </button>
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </div>
  );
}
