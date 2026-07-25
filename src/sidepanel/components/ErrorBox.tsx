import type { AppError } from '@/shared/types';

export function ErrorBox({ error }: { error: AppError }) {
  return (
    <div className="error-box" role="alert">
      <strong>{error.message}</strong>
      {error.cause ? <p className="muted">Cause: {error.cause}</p> : null}
      {error.impact ? <p>{error.impact}</p> : null}
      {error.nextSteps?.length ? (
        <>
          <p>
            <strong>Next steps</strong>
          </p>
          <ol>
            {error.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}
