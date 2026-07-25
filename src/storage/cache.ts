import type {
  AnswerLength,
  ExtractedPage,
  ReadingLevel,
  SummarizeMode,
} from '@/shared/types';

const DB_NAME = 'vaultlens';
const DB_VERSION = 1;
const STORE_SUMMARY = 'summaryCache';
const STORE_HISTORY = 'history';

export interface SummaryCacheEntry {
  key: string;
  url: string;
  mode: SummarizeMode;
  readingLevel: ReadingLevel;
  answerLength: AnswerLength;
  text: string;
  createdAt: string;
  providerId: string;
  model: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IDB open failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SUMMARY)) {
        db.createObjectStore(STORE_SUMMARY, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_HISTORY)) {
        db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
      }
    };
  });
}

function summaryKey(
  url: string,
  mode: SummarizeMode,
  providerId: string,
  readingLevel: ReadingLevel,
  answerLength: AnswerLength,
): string {
  return `${providerId}::${mode}::${readingLevel}::${answerLength}::${url}`;
}

export async function getSummaryCache(
  url: string,
  mode: SummarizeMode,
  providerId: string,
  readingLevel: ReadingLevel,
  answerLength: AnswerLength,
): Promise<SummaryCacheEntry | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SUMMARY, 'readonly');
    const store = tx.objectStore(STORE_SUMMARY);
    const req = store.get(summaryKey(url, mode, providerId, readingLevel, answerLength));
    req.onsuccess = () => resolve((req.result as SummaryCacheEntry) ?? null);
    req.onerror = () => reject(req.error ?? new Error('IDB get failed'));
  });
}

export async function setSummaryCache(
  entry: Omit<SummaryCacheEntry, 'key'>,
): Promise<void> {
  const db = await openDb();
  const full: SummaryCacheEntry = {
    ...entry,
    key: summaryKey(
      entry.url,
      entry.mode,
      entry.providerId,
      entry.readingLevel,
      entry.answerLength,
    ),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SUMMARY, 'readwrite');
    tx.objectStore(STORE_SUMMARY).put(full);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB put failed'));
  });
}

export async function clearSummaryCache(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SUMMARY, 'readwrite');
    tx.objectStore(STORE_SUMMARY).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB clear failed'));
  });
}

export async function clearHistory(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HISTORY, 'readwrite');
    tx.objectStore(STORE_HISTORY).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IDB clear failed'));
  });
}

export async function clearAllLocalData(): Promise<void> {
  await clearSummaryCache();
  await clearHistory();
  await chrome.storage.local.clear();
}

/** Page extract is task-memory only — intentionally not persisted here. */
export type TransientPage = ExtractedPage;
