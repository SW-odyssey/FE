import { handlePlacePhotos } from "../../../../server/place-photos.ts";

export const dynamic = "force-dynamic";

export function GET(request) {
  return handlePlacePhotos(request, process.env.GOOGLE_PLACES_API_KEY);
}
