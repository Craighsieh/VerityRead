import { describe, expect, it } from 'vitest';
import {
  CONTEXT_MENU_ACTION_MAX_AGE_MS,
  isFreshContextMenuAction,
  isPendingContextMenuAction,
} from '@/shared/contextMenuAction';

const pendingAction = {
  requestId: 'request-1',
  action: 'explain' as const,
  text: 'Selected article text',
  createdAt: 10_000,
};

describe('pending context-menu actions', () => {
  it('accepts a complete supported action and rejects unsafe shapes', () => {
    expect(isPendingContextMenuAction(pendingAction)).toBe(true);
    expect(isPendingContextMenuAction({ ...pendingAction, action: 'unknown' })).toBe(
      false,
    );
    expect(isPendingContextMenuAction({ ...pendingAction, text: '  ' })).toBe(false);
  });

  it('expires unclaimed selected text after a short bounded window', () => {
    expect(isFreshContextMenuAction(pendingAction, 10_001)).toBe(true);
    expect(
      isFreshContextMenuAction(
        pendingAction,
        pendingAction.createdAt + CONTEXT_MENU_ACTION_MAX_AGE_MS + 1,
      ),
    ).toBe(false);
  });
});
