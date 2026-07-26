import type { ContextMenuActionMessage } from './messages';

export const PENDING_CONTEXT_MENU_ACTION_KEY = 'pendingContextMenuAction';
export const CONTEXT_MENU_ACTION_MAX_AGE_MS = 30_000;

export interface PendingContextMenuAction extends Pick<
  ContextMenuActionMessage,
  'requestId' | 'action' | 'text'
> {
  createdAt: number;
}

export function isPendingContextMenuAction(
  value: unknown,
): value is PendingContextMenuAction {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PendingContextMenuAction>;
  return (
    typeof candidate.requestId === 'string' &&
    ['translate', 'explain', 'simplify', 'ask'].includes(candidate.action ?? '') &&
    typeof candidate.text === 'string' &&
    candidate.text.trim().length > 0 &&
    typeof candidate.createdAt === 'number'
  );
}

export function isFreshContextMenuAction(
  action: PendingContextMenuAction,
  now = Date.now(),
): boolean {
  return now - action.createdAt <= CONTEXT_MENU_ACTION_MAX_AGE_MS;
}
