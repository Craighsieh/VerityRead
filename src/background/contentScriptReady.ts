interface ContentScriptReadinessOptions {
  attempts?: number;
  delayMs?: number;
  wait?: (delayMs: number) => Promise<void>;
}

const wait = (delayMs: number): Promise<void> =>
  new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));

/**
 * CRXJS injects a small loader before its module bundle finishes registering
 * the message listener. Poll briefly so a successful user-authorized injection
 * is not misreported as inaccessible during that startup window.
 */
export async function waitForContentScriptReady(
  ping: () => Promise<boolean>,
  options: ContentScriptReadinessOptions = {},
): Promise<boolean> {
  const attempts = Math.max(1, options.attempts ?? 20);
  const delayMs = Math.max(0, options.delayMs ?? 100);
  const waitForNextAttempt = options.wait ?? wait;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await ping()) return true;
    if (attempt < attempts - 1) {
      await waitForNextAttempt(delayMs);
    }
  }

  return false;
}
