import {
  DEFAULT_PREFERENCES,
  CURRENT_PRIVACY_CONSENT_VERSION,
  OLLAMA_DEFAULT_URL,
  type UserPreferences,
} from '@/shared/types';

const PREF_KEY = 'verityread.preferences';
const LEGACY_PREF_KEY = 'vaultlens.preferences';
const STORAGE_VERSION_KEY = 'verityread.storageVersion';
const CURRENT_STORAGE_VERSION = 2;
const LEGACY_DB_NAME = 'vaultlens';

let migrationPromise: Promise<void> | null = null;

function deleteLegacyDatabase(): Promise<void> {
  if (typeof indexedDB === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(LEGACY_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

async function migrateLegacyStorage(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  const current = await chrome.storage.local.get([
    STORAGE_VERSION_KEY,
    PREF_KEY,
    LEGACY_PREF_KEY,
  ]);
  const version = Number(current[STORAGE_VERSION_KEY] ?? 0);
  if (version >= CURRENT_STORAGE_VERSION) return;

  const currentPreferences = current[PREF_KEY] as Partial<UserPreferences> | undefined;
  const legacyPreferences = current[LEGACY_PREF_KEY] as
    | Partial<UserPreferences>
    | undefined;
  const combinedPreferences = {
    ...DEFAULT_PREFERENCES,
    ...legacyPreferences,
    ...currentPreferences,
  };
  const privacyConsentVersion =
    combinedPreferences.privacyConsentVersion === CURRENT_PRIVACY_CONSENT_VERSION
      ? CURRENT_PRIVACY_CONSENT_VERSION
      : null;
  const migratedPreferences = {
    ...combinedPreferences,
    // Persist the consent gate instead of relying only on the derived read
    // value, so every extension context observes the same safe state.
    privacyConsentVersion,
    onboardingComplete:
      combinedPreferences.onboardingComplete && privacyConsentVersion !== null,
    // Version 0.1.0 changes summary persistence from opt-out to opt-in.
    cacheSummaries: false,
    // Custom endpoints are intentionally deferred; migration closes the older
    // configuration path instead of retaining a broader network destination.
    ollamaBaseUrl: OLLAMA_DEFAULT_URL,
  };

  await deleteLegacyDatabase();
  await chrome.storage.local.set({
    [PREF_KEY]: migratedPreferences,
    [STORAGE_VERSION_KEY]: CURRENT_STORAGE_VERSION,
  });
  await chrome.storage.local.remove(LEGACY_PREF_KEY);
}

async function ensureStorageMigration(): Promise<void> {
  migrationPromise ??= migrateLegacyStorage().catch((error: unknown) => {
    migrationPromise = null;
    throw error;
  });
  await migrationPromise;
}

export async function getPreferences(): Promise<UserPreferences> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return { ...DEFAULT_PREFERENCES };
  }
  await ensureStorageMigration();
  const result = await chrome.storage.local.get(PREF_KEY);
  const stored = result[PREF_KEY] as Partial<UserPreferences> | undefined;
  const merged = { ...DEFAULT_PREFERENCES, ...stored };
  return {
    ...merged,
    onboardingComplete:
      merged.onboardingComplete &&
      merged.privacyConsentVersion === CURRENT_PRIVACY_CONSENT_VERSION,
  };
}

export async function setPreferences(
  patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
  await ensureStorageMigration();
  const current = await getPreferences();
  const next = {
    ...current,
    ...patch,
    ollamaBaseUrl: OLLAMA_DEFAULT_URL,
  };
  if (next.privacyConsentVersion !== CURRENT_PRIVACY_CONSENT_VERSION) {
    next.onboardingComplete = false;
  }
  await chrome.storage.local.set({ [PREF_KEY]: next });
  return next;
}

export async function clearPreferences(): Promise<void> {
  await chrome.storage.local.remove(PREF_KEY);
}
