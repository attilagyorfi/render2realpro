/**
 * rate-limit.ts
 *
 * Minimal in-memory sliding-window rate limiter for the auth endpoints.
 * Good enough for a single-instance pilot deploy (Railway runs one
 * container); if the app ever scales horizontally, swap the Map for a
 * shared store (Redis/Postgres) behind the same function signatures.
 *
 * Semantics: only FAILED attempts count toward the limit, and a
 * successful sign-in clears the counter — so a legitimate user who
 * mistypes twice and then succeeds doesn't stay penalised.
 */

type WindowEntry = {
  count: number;
  windowStartMs: number;
};

const failures = new Map<string, WindowEntry>();

// Periodic sweep so abandoned keys don't accumulate forever. Lazy —
// runs at most once per minute, piggybacked on lookups.
let lastSweepMs = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(windowMs: number): void {
  const now = Date.now();
  if (now - lastSweepMs < SWEEP_INTERVAL_MS) return;
  lastSweepMs = now;
  for (const [key, entry] of failures) {
    if (now - entry.windowStartMs > windowMs) failures.delete(key);
  }
}

export type RateLimitVerdict = {
  allowed: boolean;
  /** Seconds until the window resets — only meaningful when !allowed. */
  retryAfterSeconds: number;
};

/**
 * Check whether the given key is currently locked out.
 * Does NOT increment anything — call registerFailure() after a failed
 * attempt and clearFailures() after a success.
 */
export function checkRateLimit(
  key: string,
  maxFailures: number,
  windowMs: number
): RateLimitVerdict {
  sweep(windowMs);
  const entry = failures.get(key);
  if (!entry) return { allowed: true, retryAfterSeconds: 0 };

  const elapsed = Date.now() - entry.windowStartMs;
  if (elapsed > windowMs) {
    failures.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxFailures) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((windowMs - elapsed) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function registerFailure(key: string, windowMs: number): void {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || now - entry.windowStartMs > windowMs) {
    failures.set(key, { count: 1, windowStartMs: now });
    return;
  }
  entry.count += 1;
}

export function clearFailures(key: string): void {
  failures.delete(key);
}

/** Best-effort client IP from proxy headers; "local" when unavailable. */
export function clientIpFrom(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

/** Test-only helper. */
export function _resetRateLimiter(): void {
  failures.clear();
  lastSweepMs = 0;
}
