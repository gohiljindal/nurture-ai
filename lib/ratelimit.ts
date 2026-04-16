import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** Shape returned by `@upstash/ratelimit` — we mirror it for the no-op fallback. */
export type SymptomLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type SymptomLimiter = {
  limit: (identifier: string) => Promise<SymptomLimitResult>;
};

function isUpstashConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
  if (!url || !token) return false;
  // Avoid instantiating Redis with placeholder values from templates
  if (url.includes("your_url") || token.includes("your_token")) return false;
  if (!url.startsWith("https://")) return false;
  return true;
}

/**
 * When Upstash is not configured, all requests are allowed. This keeps local dev and
 * `next build` working without Redis. For production traffic limits, set both env vars.
 */
function createNoOpLimiter(): SymptomLimiter {
  let warnedMissingRedis = false;
  return {
    limit: async (_identifier: string) => {
      if (!warnedMissingRedis && process.env.NODE_ENV === "production") {
        warnedMissingRedis = true;
        console.warn(
          "[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — symptom rate limiting is disabled. Set both in production for abuse protection."
        );
      }
      return {
        success: true,
        limit: 10,
        remaining: 10,
        reset: Date.now() + 600_000,
      };
    },
  };
}

function createUpstashLimiter(): SymptomLimiter {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "10 m"),
    analytics: true,
    prefix: "nurtureai:symptom",
  });
}

const useRedis = isUpstashConfigured();

export const symptomRateLimit: SymptomLimiter = useRedis
  ? createUpstashLimiter()
  : createNoOpLimiter();
