import { describe, expect, it } from 'vitest';
import { isAllowedWhenLocked } from '@/core/offlineLock';

describe('offlineLock', () => {
  it('allows extension and loopback', () => {
    expect(isAllowedWhenLocked('chrome-extension://abc/sidepanel.html')).toBe(true);
    expect(isAllowedWhenLocked('http://127.0.0.1:11434/api/tags')).toBe(true);
    expect(isAllowedWhenLocked('http://localhost:11434/api/tags')).toBe(true);
  });

  it('blocks non-loopback network', () => {
    expect(isAllowedWhenLocked('https://api.example.com/v1')).toBe(false);
    expect(isAllowedWhenLocked('http://192.168.0.5:11434/api/tags')).toBe(false);
  });
});
