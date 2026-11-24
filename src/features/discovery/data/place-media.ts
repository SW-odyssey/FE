import type { DiscoveryLanguage, LocalPlace, PlacePhoto } from "../model";

export type PlaceBusiness = {
  about?: string;
  rating?: number;
  ratingCount?: number;
  phone?: string;
  website?: string;
  hours?: string[];
  mapsUrl?: string;
};
export type PlaceMedia = {
  photoList: PlacePhoto[];
  address?: string;
  business?: PlaceBusiness;
};
type Variant = "thumbnail" | "gallery";
const requests = new Map<string, Promise<PlaceMedia>>();

/** Check whether a real Odyssey place can be resolved by the photo service. */
export function hasPlaceMedia(place: Pick<LocalPlace, "id" | "googlePlaceId">) {
  return Boolean(place.googlePlaceId) && /^[1-9]\d*$/.test(place.id);
}

/** Share concurrent lookups without retaining transient Google photo URLs. */
export function getPlaceMedia(
  id: string,
  variant: Variant,
  language?: DiscoveryLanguage,
): Promise<PlaceMedia> {
  const key = `${id}:${variant}:${language ?? ""}`;
  const active = requests.get(key);
  if (active) return active;
  const params = new URLSearchParams({ id, variant });
  if (language) params.set("lang", language);
  const lookup = fetch(`/api/place-photos?${params}`, { cache: "no-store" })
    .then((response) =>
      response.ok
        ? (response.json() as Promise<PlaceMedia>)
        : { photoList: [] },
    )
    .finally(() => requests.delete(key));
  requests.set(key, lookup);
  return lookup;
}
