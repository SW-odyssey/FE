import type { DiscoveryLanguage, LocalPlace } from "../model.ts";
import { v2Place, type ApiPlace } from "./course-api.ts";
import { getV2Data } from "./v2-client.ts";

/** Wait this long after the last keystroke before asking the server (BE PLACE_SEARCH.md). */
export const placeSearchDelay = 250;
/** The server rejects longer terms. */
export const placeSearchMaxLength = 80;

/**
 * @param value The text in the search field
 * @returns The term to send, trimmed and cut to the server limit; "" sends nothing
 */
export function placeSearchTerm(value: string): string {
  return value.trim().slice(0, placeSearchMaxLength);
}

/**
 * Search active stores by name in all four languages with GET /api/v2/place-search.
 *
 * @param q A non-empty term from {@link placeSearchTerm}
 * @param language Display language for the returned names
 * @param limit 1–30 results; the server default is 6
 * @param signal Cancels the request when the term or language changes
 * @returns Places in server order with their server IDs. Location, visit time
 * and score are not applied, so bars, shops and activities are included.
 */
export async function searchPlaces(
  q: string,
  language: DiscoveryLanguage | undefined,
  limit: number,
  signal?: AbortSignal,
): Promise<LocalPlace[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (language) params.set("lang", language);
  const { items } = await getV2Data<{ items: ApiPlace[] }>(
    "place-search",
    signal,
    params,
  );
  return items.map(v2Place);
}
