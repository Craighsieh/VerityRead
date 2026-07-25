import type { PrivacyReceipt } from '@/shared/types';
import { t } from '@/i18n';

export function PrivacyReceiptView({ receipt }: { receipt: PrivacyReceipt }) {
  return (
    <div className="card receipt" aria-label={t('privacyReceipt')}>
      <h3>{t('privacyReceipt')}</h3>
      <div className="stack">
        <div>
          {t('receiptProvider')}: <code>{receipt.providerId}</code> /{' '}
          <code>{receipt.model}</code>
        </div>
        <div>
          {t('receiptInference')}: <code>{receipt.inferenceLocation}</code>
        </div>
        <div>
          {t('receiptContentSource')}: <code>{receipt.contentSource}</code>
        </div>
        <div>
          {t('receiptSaved')}:{' '}
          <code>
            {String(receipt.savedInput)}/{String(receipt.savedOutput)}
          </code>
        </div>
        <div>
          {t('receiptCloud')}:{' '}
          <strong style={{ color: 'var(--success)' }}>false</strong>
        </div>
        <div>
          {t('receiptDestinations')}:
          <ul>
            {receipt.allowedDestinations.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
