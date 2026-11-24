import type { LocalPlace } from "./model.ts";

export type CourseStop = Pick<
  LocalPlace,
  "id" | "name" | "koreanName" | "area" | "category" | "image" | "lat" | "lng"
>;

export type CourseOptions = {
  includeCafe: boolean;
  includeBrowse: boolean;
  includeLate: boolean;
};

export const defaultCourseOptions: CourseOptions = {
  includeCafe: true,
  includeBrowse: false,
  includeLate: false,
};

type GoogleMapsPlace = Pick<
  LocalPlace,
  "koreanName" | "address" | "googlePlaceId"
>;

/**
 * Open the recommended stops as a Google Maps shortlist when they all have Place IDs.
 * @param stops Places in the recommended visit order
 * @returns The shortlist link, a single place link, or null when a complete list cannot be opened
 */
export function googleMapsCourseLink(stops: readonly GoogleMapsPlace[]) {
  const placeIds = stops.map(({ googlePlaceId }) => googlePlaceId);
  if (placeIds.length > 1 && placeIds.every(Boolean)) {
    const url = new URL("https://www.google.com/maps/@");
    url.searchParams.set("api", "1");
    url.searchParams.set("map_action", "shortlist");
    url.searchParams.set("place_ids", placeIds.join(","));
    return url.href;
  }
  return stops.length === 1 ? googleMapsPlaceUrl(stops[0]) : null;
}

/** Build the Google Maps search link for one stop by name, address and optional Place ID. */
export function googleMapsPlaceUrl(place: GoogleMapsPlace): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", `${place.koreanName} ${place.address}`);
  if (place.googlePlaceId)
    url.searchParams.set("query_place_id", place.googlePlaceId);
  return url.href;
}
