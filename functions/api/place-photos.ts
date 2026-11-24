import { handlePlacePhotos } from "../../server/place-photos";

/** Bind the server-side Places key in the local Pages runtime. */
export function onRequestGet({
  request,
  env,
}: {
  request: Request;
  env: { GOOGLE_PLACES_API_KEY?: string };
}) {
  return handlePlacePhotos(request, env.GOOGLE_PLACES_API_KEY);
}
