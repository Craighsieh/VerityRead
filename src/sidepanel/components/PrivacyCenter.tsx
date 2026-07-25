import { useState } from 'react';
import { ALLOWED_NETWORK_DESTINATIONS, type UserPreferences } from '@/shared/types';
import { clearAllLocalData, clearHistory, clearSummaryCache } from '@/storage';
import { setPreferences } from '@/storage/preferences';

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
    setStatus(`Cleared: ${scope}`);
  };

  return (
    <div className="stack">
      <div className="card stack">
        <h2>Privacy Center</h2>
        <p className="muted">
          Verify where data goes. Page content never enters download, license, or
          update requests.
        </p>
        <div>
          Default Provider: <code>{preferences.defaultProviderId}</code>
        </div>
        <div>
          Offline Lock:{' '}
          <strong>{preferences.offlineLock ? 'ON' : 'OFF'}</strong>
        </div>
        <div>
          History: <strong>{preferences.historyEnabled ? 'ON' : 'OFF (default)'}</strong>
        </div>
        {lastReceiptSummary && (
          <p className="muted">Last task: {lastReceiptSummary}</p>
        )}
      </div>

      <div className="card stack">
        <h3>Offline Lock</h3>
        <p className="muted">
          When enabled, only extension resources and loopback (Ollama) are allowed.
          License refresh and non-loopback downloads are paused.
        </p>
        <label className="row">
          <input
            type="checkbox"
            checked={preferences.offlineLock}
            onChange={(e) => void onUpdate({ offlineLock: e.target.checked })}
          />
          Enable Offline Lock
        </label>
      </div>

      <div className="card stack">
        <h3>Allowed network destinations</h3>
        <ul>
          {ALLOWED_NETWORK_DESTINATIONS.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>

      <div className="card stack">
        <h3>Clear local data</h3>
        <div className="row">
          <button type="button" className="btn" onClick={() => void clear('cache')}>
            Clear cache
          </button>
          <button type="button" className="btn" onClick={() => void clear('history')}>
            Clear history
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => void clear('all')}
          >
            Clear all local data
          </button>
        </div>
        {status && <p className="muted">{status}</p>}
      </div>
    </div>
  );
}
