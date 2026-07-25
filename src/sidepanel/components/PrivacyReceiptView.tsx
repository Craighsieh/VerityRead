import type { PrivacyReceipt } from '@/shared/types';

export function PrivacyReceiptView({ receipt }: { receipt: PrivacyReceipt }) {
  return (
    <div className="card receipt" aria-label="Privacy receipt">
      <h3>Privacy receipt</h3>
      <div className="stack">
        <div>
          Provider: <code>{receipt.providerId}</code> / <code>{receipt.model}</code>
        </div>
        <div>
          Inference: <code>{receipt.inferenceLocation}</code>
        </div>
        <div>
          Content source: <code>{receipt.contentSource}</code>
        </div>
        <div>
          Saved input/output:{' '}
          <code>
            {String(receipt.savedInput)}/{String(receipt.savedOutput)}
          </code>
        </div>
        <div>
          Page content sent to cloud inference:{' '}
          <strong style={{ color: 'var(--success)' }}>false</strong>
        </div>
        <div>
          Allowed destinations:
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
