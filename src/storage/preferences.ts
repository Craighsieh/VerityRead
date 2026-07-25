import { DEFAULT_PREFERENCES, type UserPreferences } from '@/shared/types';

const PREF_KEY = 'vaultlens.preferences';

export async function getPreferences(): Promise<UserPreferences> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return { ...DEFAULT_PREFERENCES };
  }
  const result = await chrome.storage.local.get(PREF_KEY);
  const stored = result[PREF_KEY] as Partial<UserPreferences> | undefined;
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export async function setPreferences(
  patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const current = await getPreferences();
  const next = { ...current, ...patch };
  await chrome.storage.local.set({ [PREF_KEY]: next });
  return next;
}

export async function clearPreferences(): Promise<void> {
  await chrome.storage.local.remove(PREF_KEY);
}
