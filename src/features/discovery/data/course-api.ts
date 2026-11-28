import type { CourseOptions } from "../course.ts";
import type {
  AreaId,
  Coordinate,
  CoursePlaceKind,
  DiscoveryLanguage,
  LocalPlace,
  VisitSlot,
} from "../model.ts";
import { mapApiIdToDiscovery, type ApiSlot } from "./api-mapping.ts";
import type { DiscoveryPlaceDetail } from "./types.ts";
import { previewPlaceDetail } from "./preview.ts";
import { localPlaces } from "./preview/places.ts";

import { getV2Data, screenSlots, v2Time } from "./v2-client.ts";

const categories = {
  korean: "food",
  bar: "food",
  other: "food",
  cafe: "cafe",
  shop: "culture",
  play: "culture",
} as const;

type StopReason =
  | "NO_NEARBY_MATCH"
  | "ALL_EXCLUDED"
  | "NO_VERIFIED_MATCH"
  | "CHECK_LIMIT"
  | "VERIFICATION_UNAVAILABLE"
  | "SKIPPED_FOR_ROUTE";

export type ApiPlace = Coordinate & {
  id: number;
  name: string;
  kind: CoursePlaceKind;
  googlePlaceId: string | null;
  cellId?: string;
  sinceDate?: string | null;
  /** Server area ID matching GET /api/v2/meta `areas[].id`. */
  areaId?: AreaId | null;
};

type ApiCourseStop = {
  position: number;
  slot: ApiSlot;
  walkMinutes: number;
  hoursUnknown: boolean;
  place: ApiPlace & { distanceMeters: number };
};

export type CourseLeg = Omit<ApiCourseStop, "slot" | "place"> & {
  slot: VisitSlot;
  place: LocalPlace;
  distanceMeters: number;
};

export type CourseGap = { slot: VisitSlot; reason: StopReason };
export type CourseSkip = CourseGap & { position: number };

type ApiCourse = {
  status: "COMPLETE" | "PARTIAL" | "NO_MATCHES";
  context: { datasetId: string };
  seed: number;
  stops: ApiCourseStop[];
  skipped: { slot: ApiSlot; position: number; reason: StopReason }[];
  interruption: { slot: ApiSlot; reason: StopReason } | null;
};

export type CourseResult = {
  status: ApiCourse["status"];
  datasetId: string;
  seed: number;
  route: CourseLeg[];
  skipped: CourseSkip[];
  interruption: CourseGap | null;
};

export type CourseRequest = {
  datasetId: string;
  visitDate: string;
  slot: VisitSlot;
  origin: Coordinate;
  seed?: number;
  excludeIds?: readonly string[];
  previousStopIds?: readonly string[];
  options?: CourseOptions;
  language?: DiscoveryLanguage;
};

/** Map the Seoul calendar date and departure slot to the course endpoint parameters. */
export function courseSearchParams(request: CourseRequest): URLSearchParams {
  const { weekday, slot } = v2Time(request.visitDate, request.slot);
  const params = new URLSearchParams({
    datasetId: request.datasetId,
    weekday,
    startSlot: slot,
    lat: String(request.origin.lat),
    lng: String(request.origin.lng),
  });
  if (request.seed !== undefined) params.set("seed", String(request.seed));
  if (request.excludeIds?.length)
    params.set("excludeIds", request.excludeIds.join(","));
  if (request.previousStopIds?.length)
    params.set("previousStopIds", request.previousStopIds.join(","));
  if (request.options && request.options.afternoon !== "cafe")
    params.set("afternoon", request.options.afternoon);
  if (request.options?.walk === "short") params.set("walk", "short");
  if (request.options?.lateNight || request.slot === "late")
    params.set("lateNight", "true");
  if (request.language) params.set("lang", request.language);
  return params;
}

/** Convert a numeric v2 place into the discovery model. */
export function v2Place(place: ApiPlace): LocalPlace {
  return {
    id: mapApiIdToDiscovery(place.id),
    name: place.name,
    koreanName: place.name,
    area: place.areaId ?? null,
    category: categories[place.kind],
    courseKind: place.kind,
    cellId: place.cellId,
    sinceDate: place.sinceDate ?? undefined,
    image: "",
    descriptionEn: "",
    descriptionKo: "",
    address: "",
    sourceUrl: "",
    lat: place.lat,
    lng: place.lng,
    googlePlaceId: place.googlePlaceId ?? undefined,
  };
}

/** Fetch the complete itinerary in one request and keep its scheduled positions. */
export async function getCourse(
  request: CourseRequest,
  signal: AbortSignal,
): Promise<CourseResult> {
  const data = await getV2Data<ApiCourse>(
    "course-recommendations",
    signal,
    courseSearchParams(request),
  );
  return {
    status: data.status,
    datasetId: data.context.datasetId,
    seed: data.seed,
    route: data.stops.map(
      ({ slot, place, position, walkMinutes, hoursUnknown }) => ({
        position,
        walkMinutes,
        hoursUnknown,
        slot: screenSlots[slot],
        place: v2Place(place),
        distanceMeters: place.distanceMeters,
      }),
    ),
    skipped: data.skipped.map(({ slot, ...skip }) => ({
      ...skip,
      slot: screenSlots[slot],
    })),
    interruption: data.interruption && {
      ...data.interruption,
      slot: screenSlots[data.interruption.slot],
    },
  };
}

/** Fetch the basic detail for a numeric course result ID. */
export async function getCoursePlaceDetail(
  id: string,
  signal?: AbortSignal,
  language?: DiscoveryLanguage,
): Promise<DiscoveryPlaceDetail> {
  const place = v2Place(
    await getV2Data<ApiPlace>(
      `places/${encodeURIComponent(id)}`,
      signal,
      language ? new URLSearchParams({ lang: language }) : undefined,
    ),
  );
  const matched = place.googlePlaceId
    ? localPlaces.find(
        (candidate) => candidate.googlePlaceId === place.googlePlaceId,
      )
    : undefined;
  const editorial = matched && previewPlaceDetail(matched);
  const empty = { ko: "", en: "", ja: "", zh: "" };
  return {
    place: { ...place, sourceUrl: editorial?.sourceUrl ?? place.sourceUrl },
    photos: [],
    summaries: empty,
    descriptions: editorial?.descriptions ?? empty,
    aiSummary: editorial?.aiSummary,
    sourceUrl: editorial?.sourceUrl ?? place.sourceUrl,
    photoCredits: [],
  };
}
