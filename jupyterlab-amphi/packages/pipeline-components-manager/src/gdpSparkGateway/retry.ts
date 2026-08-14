/**
 * Retry / backoff helpers for Gateway HTTP calls (G9.3).
 */

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  /** Return true to retry this error. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

export function isRetryableGatewayError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err);
  if (/Network error/i.test(msg)) {
    return true;
  }
  if (/HTTP 5\d\d/.test(msg)) {
    return true;
  }
  if (/HTTP 429/.test(msg)) {
    return true;
  }
  return false;
}

/** Exponential backoff: base * 2^(attempt-1), capped. */
export function retryDelayMs(attempt: number, baseDelayMs: number): number {
  const exp = Math.max(0, attempt - 1);
  return Math.min(baseDelayMs * 2 ** exp, 8000);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 300;
  const shouldRetry = options.shouldRetry ?? isRetryableGatewayError;
  const sleep = options.sleep ?? defaultSleep;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= attempts || !shouldRetry(err, attempt)) {
        throw err;
      }
      await sleep(retryDelayMs(attempt, baseDelayMs));
    }
  }
  throw lastErr;
}
