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
import type { CellReasonCode } from "../cell-reasons";
import type { ApiWeekday } from "./v2-client";
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
  datasetId?: string;
  language?: DiscoveryLanguage;
};
export type DiscoveryQueryResult = {
  /** Places loaded so far, without duplicate IDs. */
  items: LocalPlace[];
  /** Server match count before paging; equals items.length for one-shot sources. */
  total: number;
  /** Area browsing only: the last loaded 0-based page and whether more exist. */
  page?: number;
  hasNext?: boolean;
  analyses?: Record<string, RecommendationAnalysis>;
  /**
   * Live list only: why each 50 m cell is recommended for the requested
   * weekday and slot, by `LocalPlace.cellId`. Missing when the lookup failed.
   */
  cellReasons?: Record<string, CellReasonCode[]>;
};
/** Recommendation evidence belongs to the response that selected the place. */
export type RecommendationAnalysis = {
  provenance: "preview" | "model";
  spaces: readonly SpacePreference[];
  matchedSpaces: readonly SpacePreference[];
  slot: VisitSlot;
  activity: AreaActivity;
};
export type VisitDayGroup = "monThu" | "fri" | "sat" | "sun";
export type AreaVisitPattern =
  | {
      provenance?: "preview";
      /** Values are relative to the highest time slot within the selected day group. */
      byDay: Record<VisitDayGroup, Record<VisitSlot, number>>;
    }
  | {
      provenance: "live";
      datasetId: string;
      /** YYYY-MM of the dataset, shown as the data reference month. */
      referenceMonth?: string;
      cellId: string;
      weekday: ApiWeekday;
    };
export type DiscoveryPlaceDetail = {
  place: LocalPlace;
  photos: PlacePhoto[];
  summaries: Record<DiscoveryLanguage, string>;
  descriptions: Record<DiscoveryLanguage, string>;
  aiSummary?: Record<DiscoveryLanguage, string>;
  sourceUrl: string;
  photoCredits: string[];
  visitPattern?: AreaVisitPattern;
};
export type DiscoveryRequestOptions = {
  signal?: AbortSignal;
  query?: DiscoveryQuery;
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
  /**
   * Load the page after `previous` for the same input and return the merged
   * result. Only sources whose results report `hasNext` implement it.
   */
  queryNext?(
    input: DiscoveryQuery,
    previous: DiscoveryQueryResult,
    options?: DiscoveryRequestOptions,
  ): Promise<DiscoveryQueryResult>;
  snapshot?: DiscoverySnapshot;
}
export type DiscoveryLoadStatus = "idle" | "loading" | "success" | "error";
export type DiscoveryResource<T> = {
  value: T;
  status: DiscoveryLoadStatus;
  error: unknown | null;
};
