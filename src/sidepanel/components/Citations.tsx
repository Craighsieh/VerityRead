import { useState } from 'react';
import type { SourceCitation } from '@/shared/types';
import { sendMessage } from '@/shared/messaging';
import { t } from '@/i18n';

export function Citations({ citations }: { citations: SourceCitation[] }) {
  const [jumpError, setJumpError] = useState('');
  if (!citations.length) return null;

  const jump = async (c: SourceCitation) => {
    setJumpError('');
    const result = await sendMessage({
      type: 'JUMP_TO_SOURCE',
      sourceBlockId: c.sourceBlockId,
      locator: c.locator,
    });
    if (!result || result.type !== 'JUMP_TO_SOURCE_RESULT' || !result.success) {
      setJumpError(
        result?.type === 'JUMP_TO_SOURCE_RESULT' && result.error
          ? result.error.message
          : t('jumpFailed'),
      );
    }
  };

  return (
    <details className="source-details">
      <summary>{t('sources', { count: citations.length })}</summary>
      <div className="source-list" aria-label={t('sourceCitations')}>
        {citations.map((c) => (
          <button
            key={c.sourceBlockId}
            type="button"
            className="citation"
            onClick={() => void jump(c)}
          >
            {c.text}
          </button>
        ))}
        {jumpError && (
          <p className="source-error" role="alert">
            {jumpError}
          </p>
        )}
      </div>
    </details>
  );
}
