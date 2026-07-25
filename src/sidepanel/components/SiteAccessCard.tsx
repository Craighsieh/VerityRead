import { useEffect, useState } from 'react';
import { sendMessage } from '@/shared/messaging';
import type { AppError } from '@/shared/types';
import { ErrorBox } from './ErrorBox';
import { t } from '@/i18n';

interface SiteAccessState {
  origin?: string;
  hasPersistentAccess: boolean;
  canRequest: boolean;
  error?: AppError;
}

const EMPTY_STATE: SiteAccessState = {
  hasPersistentAccess: false,
  canRequest: false,
};

export function SiteAccessCard() {
  const [state, setState] = useState<SiteAccessState>(EMPTY_STATE);
  const [working, setWorking] = useState(false);

  const refresh = async () => {
    const result = await sendMessage({ type: 'GET_SITE_ACCESS' });
    if (result?.type === 'SITE_ACCESS_RESULT') {
      setState(result);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const changeAccess = async (allow: boolean) => {
    setWorking(true);
    try {
      const result = await sendMessage({
        type: allow ? 'REQUEST_SITE_ACCESS' : 'REMOVE_SITE_ACCESS',
      });
      if (result?.type === 'SITE_ACCESS_RESULT') {
        setState(result);
      }
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="card stack">
      <h3>{t('currentSiteAccess')}</h3>
      <p className="muted">{t('siteAccessBody')}</p>
      {state.origin ? <code>{state.origin}</code> : null}
      <div>
        {t('persistentAccess')}:{' '}
        <strong>{state.hasPersistentAccess ? t('allowed') : t('notAllowed')}</strong>
      </div>
      <div className="row">
        {state.hasPersistentAccess ? (
          <button
            type="button"
            className="btn"
            disabled={working}
            onClick={() => void changeAccess(false)}
          >
            {t('removeSiteAccess')}
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={working || !state.canRequest}
            onClick={() => void changeAccess(true)}
          >
            {t('alwaysAllowSite')}
          </button>
        )}
        <button type="button" className="btn ghost" onClick={() => void refresh()}>
          {t('refresh')}
        </button>
      </div>
      {state.error ? <ErrorBox error={state.error} /> : null}
    </div>
  );
}
