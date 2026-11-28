import { handlePlacePhotos } from "../../../../server/place-photos.ts";

export const dynamic = "force-dynamic";

export function GET(request) {
  // Same variable names as the Pages Functions env (#82).
  return handlePlacePhotos(
    request,
    process.env.GOOGLE_PLACES_API_KEY,
    undefined,
    process.env,
  );
}
