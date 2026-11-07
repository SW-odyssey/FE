import type {
  AreaActivity,
  Coordinate,
  DiscoveryArea,
  DiscoveryCategory,
  DiscoveryLanguage,
  LocalPlace,
  PlacePhoto,
  SpacePreference,
  VisitSlot,
} from "../model";
/** UI selections already derived by the screen; the source does not read its clock. */
export type DiscoveryQuery = {
  area: DiscoveryArea;
  category: DiscoveryCategory;
  query: string;
  slot: VisitSlot;
  activity: AreaActivity;
  origin: Coordinate | null;
  spaces: readonly SpacePreference[];
  visitDate?: string;
};
export type DiscoveryQueryResult = {
  items: LocalPlace[];
  total: number;
};
export type DiscoveryPlaceDetail = {
  place: LocalPlace;
  photos: PlacePhoto[];
  summaries: Record<DiscoveryLanguage, string>;
  descriptions: Record<DiscoveryLanguage, string>;
  sourceUrl: string;
  photoCredits: string[];
};
export type DiscoveryRequestOptions = {
  signal?: AbortSignal;
};
/** A complete synchronous source, used by the preview to avoid a loading frame. */
export type DiscoverySnapshot = {
  query(input: DiscoveryQuery): DiscoveryQueryResult;
  getPlace(id: string): DiscoveryPlaceDetail | null;
};
/** Async adapters return the same screen model; only preview supplies snapshot. */
export interface DiscoveryDataSource {
  query(
    input: DiscoveryQuery,
    options?: DiscoveryRequestOptions,
  ): Promise<DiscoveryQueryResult>;
  getPlace(
    id: string,
    options?: DiscoveryRequestOptions,
  ): Promise<DiscoveryPlaceDetail | null>;
  snapshot?: DiscoverySnapshot;
}
export type DiscoveryLoadStatus = "idle" | "loading" | "success" | "error";
export type DiscoveryResource<T> = {
  value: T;
  status: DiscoveryLoadStatus;
  error: unknown | null;
};
