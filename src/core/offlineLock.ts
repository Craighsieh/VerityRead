import { getPreferences } from '@/storage/preferences';
import { createAppError } from '@/shared/errors';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost']);

/**
 * Offline Lock: allow only extension self resources + loopback.
 * Blocks license refresh, model version checks, and non-loopback fetches.
 */
export async function isOfflineLockEnabled(): Promise<boolean> {
  const prefs = await getPreferences();
  return prefs.offlineLock;
}

export function isAllowedWhenLocked(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'chrome-extension:') return true;
    if (parsed.protocol === 'data:') return true;
    if (LOOPBACK_HOSTS.has(parsed.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

export async function assertNetworkAllowed(url: string): Promise<void> {
  if (!(await isOfflineLockEnabled())) return;
  if (!isAllowedWhenLocked(url)) {
    throw createAppError('OFFLINE_LOCK_BLOCKED', {
      cause: `Blocked destination: ${url}`,
    });
  }
}

/** Wrap fetch to enforce Offline Lock for extension code paths. */
export async function guardedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  await assertNetworkAllowed(url);
  return fetch(input, init);
}
