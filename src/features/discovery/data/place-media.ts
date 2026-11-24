import type { LocalPlace, PlacePhoto } from "../model";

export type PlaceMedia = { photoList: PlacePhoto[]; address?: string };
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
): Promise<PlaceMedia> {
  const key = `${id}:${variant}`;
  const active = requests.get(key);
  if (active) return active;
  const params = new URLSearchParams({ id, variant });
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
