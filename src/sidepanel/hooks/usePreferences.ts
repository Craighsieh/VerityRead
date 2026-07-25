import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PREFERENCES, type UserPreferences } from '@/shared/types';
import { getPreferences, setPreferences } from '@/storage/preferences';

export function usePreferences() {
  const [preferences, setLocal] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const prefs = await getPreferences();
    setLocal(prefs);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const update = useCallback(async (patch: Partial<UserPreferences>) => {
    const next = await setPreferences(patch);
    setLocal(next);
    return next;
  }, []);

  return { preferences, loading, update, reload };
}
