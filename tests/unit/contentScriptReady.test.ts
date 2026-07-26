import { describe, expect, it, vi } from 'vitest';
import { waitForContentScriptReady } from '@/background/contentScriptReady';

describe('waitForContentScriptReady', () => {
  it('allows an injected module loader time to register its listener', async () => {
    const ping = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const wait = vi.fn<() => Promise<void>>().mockResolvedValue();

    await expect(
      waitForContentScriptReady(ping, {
        attempts: 5,
        delayMs: 100,
        wait,
      }),
    ).resolves.toBe(true);
    expect(ping).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(100);
  });

  it('stops after the bounded number of failed pings', async () => {
    const ping = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const wait = vi.fn<() => Promise<void>>().mockResolvedValue();

    await expect(
      waitForContentScriptReady(ping, {
        attempts: 3,
        delayMs: 50,
        wait,
      }),
    ).resolves.toBe(false);
    expect(ping).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });
});
