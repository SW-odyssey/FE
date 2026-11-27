import { handlePlacePhotos } from "../../server/place-photos";
import type { RateLimitBinding } from "../../server/place-quota";
import type { PlaceServerEnv } from "../../server/place-request";

/** Bind the server-side Places key in the local Pages runtime. */
export function onRequestGet({
  request,
  env,
}: {
  request: Request;
  env: PlaceServerEnv & {
    GOOGLE_PLACES_API_KEY?: string;
    /** Optional Cloudflare rate-limit binding shared across instances (#81). */
    PLACE_PHOTOS_RATE_LIMITER?: RateLimitBinding;
  };
}) {
  return handlePlacePhotos(
    request,
    env.GOOGLE_PLACES_API_KEY,
    env.PLACE_PHOTOS_RATE_LIMITER,
    env,
  );
}
