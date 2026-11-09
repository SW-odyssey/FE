import { localizedPlaceSummary } from "../localization.ts";
import type { DiscoveryLanguage, LocalPlace, PlacePhoto } from "../model";
import { previewSummaries } from "./preview/copy.ts";
import photoManifest from "./preview/guide-photos.json" with { type: "json" };
import { localPlaces } from "./preview/places.ts";
import {
  filterLocalPlaces,
  recommendPlaces,
} from "./preview/recommendations.ts";
import type {
  DiscoveryDataSource,
  DiscoveryPlaceDetail,
  DiscoveryQuery,
  DiscoveryQueryResult,
  DiscoveryRequestOptions,
} from "./types";
const languages: DiscoveryLanguage[] = ["en", "ko", "ja", "zh"];
/**
 * @param place A preview fixture, including its existing source and photo paths
 * @returns Gallery order and text fallbacks identical to the current screen
 */
export function previewPlaceDetail(place: LocalPlace): DiscoveryPlaceDetail {
  const photos = (photoManifest as Record<string, PlacePhoto[]>)[place.id] ?? [
    {
      src: place.image,
      kind: "exterior" as const,
      credit: place.imageCredit ?? "",
      sourceUrl: place.sourceUrl,
      imageUrl: place.imageSourceUrl ?? place.sourceUrl,
    },
  ];
  const summaries = {} as Record<DiscoveryLanguage, string>;
  const descriptions = {} as Record<DiscoveryLanguage, string>;
  for (const language of languages) {
    const ko = language === "ko";
    const translated = localizedPlaceSummary(place.id, language);
    descriptions[language] =
      translated ?? (ko ? place.descriptionKo : place.descriptionEn);
    summaries[language] =
      translated ??
      previewSummaries[place.id]?.[ko ? 1 : 0] ??
      (ko
        ? (place.summaryKo ?? place.descriptionKo)
        : (place.summaryEn ?? place.descriptionEn));
  }
  return {
    place,
    photos,
    summaries,
    descriptions,
    sourceUrl: place.sourceUrl,
    photoCredits: [...new Set(photos.map((photo) => photo.credit))],
  };
}
const details = new Map(
  localPlaces.map((place) => [place.id, previewPlaceDetail(place)]),
);
/**
 * @param input Existing screen filters; visitDate intentionally does not affect preview ranking
 * @returns The same fixture references, ordering and count as the previous screen
 */
export function previewQuery(input: DiscoveryQuery): DiscoveryQueryResult {
  const items = recommendPlaces(
    filterLocalPlaces(localPlaces, input.area, input.category, input.query),
    input.slot,
    input.activity,
    input.origin,
    input.spaces,
  );
  return { items, total: items.length };
}
function checkAbort(options?: DiscoveryRequestOptions) {
  if (options?.signal?.aborted)
    throw options.signal.reason ?? new DOMException("Aborted", "AbortError");
}
/** Preview is synchronous in the hook and also implements the future async port. */
export const previewDataSource: DiscoveryDataSource = {
  snapshot: {
    query: previewQuery,
    getPlace: (id) => details.get(id) ?? null,
  },
  async query(input, options) {
    checkAbort(options);
    return previewQuery(input);
  },
  async getPlace(id, options) {
    checkAbort(options);
    return details.get(id) ?? null;
  },
};
