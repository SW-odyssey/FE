import type { DiscoveryLanguage } from "../model.ts";
import type { ApiPlace } from "./course-api.ts";
import { getV2Data } from "./v2-client.ts";

/**
 * Read only the display names of course stops in another language, so a
 * language switch keeps the same stores, order, seed and swaps.
 *
 * @param ids Numeric place IDs of the current route
 * @param language Target UI language; the server returns the Korean name
 * when it has no translation
 * @param signal Cancels an outdated switch
 * @returns Names by place ID. A failed lookup is left out so the caller keeps
 * the name it already shows.
 */
export async function getCourseNames(
  ids: readonly string[],
  language: DiscoveryLanguage,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    [...new Set(ids)].map(async (id) => {
      try {
        const place = await getV2Data<ApiPlace>(
          `places/${encodeURIComponent(id)}`,
          signal,
          new URLSearchParams({ lang: language }),
        );
        return [[id, place.name]] as const;
      } catch (error) {
        signal?.throwIfAborted();
        void error;
        return [];
      }
    }),
  );
  return Object.fromEntries(entries.flat());
}
