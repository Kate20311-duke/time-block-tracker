/**
 * In-memory per-process rate limit for assistant routes.
 *
 * Limitation: on Vercel serverless each instance has its own memory, so this is
 * best-effort abuse protection — not a globally consistent quota.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

export function checkAssistantRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const existing = store.get(params.key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + params.windowMs;
    store.set(params.key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(params.limit - 1, 0),
      resetAt,
    };
  }

  if (existing.count >= params.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(params.limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

/** Test helper — clears the in-memory store. */
export function resetAssistantRateLimitStore(): void {
  store.clear();
}
