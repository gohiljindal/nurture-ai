/**
 * Retry transient OpenAI failures (429, 503, 5xx). Keeps latency bounded via outer timeouts in routes.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetriableOpenAiError(error: unknown): boolean {
  if (error === null || error === undefined) return false;
  const e = error as { status?: number; code?: string; message?: string };
  if (typeof e.status === "number") {
    if (e.status === 429) return true;
    if (e.status === 503) return true;
    if (e.status >= 500) return true;
    return false;
  }
  const msg = typeof e.message === "string" ? e.message : "";
  if (/rate limit|overloaded|timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) return true;
  return false;
}

export type OpenAiRetryOptions = {
  maxAttempts?: number;
  baseBackoffMs?: number;
  requestId: string;
};

/**
 * Runs `fn` up to `maxAttempts` times when OpenAI returns a retriable error.
 * Does not catch application-level JSON parse failures.
 * `fn` is invoked each attempt; keep OpenAI calls and timeout races inside it.
 */
export async function withOpenAiRetry<T>(
  fn: () => Promise<T>,
  options: OpenAiRetryOptions
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const base = options.baseBackoffMs ?? 400;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt >= maxAttempts || !isRetriableOpenAiError(e)) {
        throw e;
      }
      const delay = base * attempt;
      console.warn(
        JSON.stringify({
          scope: "openai_retry",
          requestId: options.requestId,
          attempt,
          nextDelayMs: delay,
          ts: new Date().toISOString(),
        })
      );
      await sleep(delay);
    }
  }
  throw lastError;
}
