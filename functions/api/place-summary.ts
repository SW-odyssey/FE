import type { RateLimitBinding } from "../../server/place-quota";
import { handlePlaceSummary } from "../../server/place-summary";

/** Bind Gemini's server key in the Cloudflare Pages runtime. */
export function onRequestPost({
  request,
  env,
}: {
  request: Request;
  env: {
    GEMINIAI_API_KEY?: string;
    /** Optional Cloudflare rate-limit binding shared across instances (#81). */
    PLACE_SUMMARY_RATE_LIMITER?: RateLimitBinding;
  };
}) {
  return handlePlaceSummary(
    request,
    env.GEMINIAI_API_KEY,
    env.PLACE_SUMMARY_RATE_LIMITER,
  );
}
