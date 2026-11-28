/**
 * Request limits for the public photo and AI summary helpers (#81).
 *
 * The limit runs before the Odyssey lookup and before any Google Places or
 * Gemini call, so a rejected request never reaches a paid provider.
 *
 * Two layers:
 * - `binding`: a Cloudflare Workers rate-limit binding configured for the
 *   Pages project. Its counters are shared by every instance in a location.
 * - otherwise an in-memory window per runtime instance. It stops bursts from
 *   one visitor but is not a global or daily cap; those belong to the
 *   Cloudflare rule and the Google Cloud quotas recorded in #81.
 */

export type PlaceQuotaKind = "photos" | "summary";

/** The `limit` method of a Cloudflare Workers rate-limit binding. */
export type RateLimitBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

type Rule = { perClient: number; perInstance: number; windowMs: number };

/**
 * A list page asks for one thumbnail per card and a detail asks for the
 * gallery, so photos allow a few pages per minute. A summary is one Gemini
 * call per opened detail.
 */
export const placeQuotaRules: Record<PlaceQuotaKind, Rule> = {
  photos: { perClient: 120, perInstance: 600, windowMs: 60_000 },
  summary: { perClient: 12, perInstance: 60, windowMs: 60_000 },
};

type Window = { started: number; count: number };
const maxTrackedClients = 5_000;
const windows = new Map<string, Window>();

function count(key: string, limit: number, windowMs: number, now: number) {
  let window = windows.get(key);
  if (!window || now - window.started >= windowMs) {
    windows.delete(key);
    if (windows.size >= maxTrackedClients) {
      const oldest = windows.keys().next().value;
      if (oldest !== undefined) windows.delete(oldest);
    }
    window = { started: now, count: 0 };
    windows.set(key, window);
  }
  if (window.count >= limit)
    return Math.max(1, Math.ceil((window.started + windowMs - now) / 1000));
  window.count += 1;
  return 0;
}

/**
 * @param request Incoming request; the client key is Cloudflare's
 * `CF-Connecting-IP`, or one shared local key in development
 * @param kind Which helper is called
 * @param binding Optional Cloudflare rate-limit binding for this helper
 * @param now Clock, for tests
 * @returns A 429 response with Retry-After, or null when the call may proceed
 */
export async function limitPlaceRequest(
  request: Request,
  kind: PlaceQuotaKind,
  binding?: RateLimitBinding,
  now = Date.now(),
): Promise<Response | null> {
  const client = request.headers.get("CF-Connecting-IP")?.trim() || "local";
  const rule = placeQuotaRules[kind];
  let retryAfter = 0;
  if (binding) {
    try {
      const { success } = await binding.limit({ key: `${kind}:${client}` });
      if (!success) retryAfter = Math.ceil(rule.windowMs / 1000);
    } catch {
      // A broken binding falls back to the instance window below.
    }
  }
  retryAfter ||=
    count(`${kind}:client:${client}`, rule.perClient, rule.windowMs, now) ||
    count(`${kind}:instance`, rule.perInstance, rule.windowMs, now);
  if (!retryAfter) return null;
  return new Response(null, {
    status: 429,
    headers: {
      "Cache-Control": "no-store",
      "Retry-After": String(retryAfter),
    },
  });
}

/** Clear the instance windows; tests only. */
export function resetPlaceQuota(): void {
  windows.clear();
}
