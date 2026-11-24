import { googleMapsPlaceUrl } from "../course.ts";
import type {
  Coordinate,
  CoursePlaceKind,
  DiscoveryArea,
  LocalPlace,
  VisitSlot,
} from "../model.ts";
import { mapApiIdToDiscovery, type ApiSlot } from "./api-mapping.ts";
import type { DiscoveryPlaceDetail } from "./types.ts";

const apiBase =
  process.env.NEXT_PUBLIC_ODYSSEY_API_BASE_URL?.trim() ||
  "https://odyssey-be-346395334988.asia-northeast3.run.app";

const origins: Record<DiscoveryArea, Coordinate> = {
  all: { lat: 37.5716, lng: 126.9861 },
  jongno: { lat: 37.5716, lng: 126.9861 },
  ikseon: { lat: 37.5736, lng: 126.989 },
  insa: { lat: 37.57445, lng: 126.98493 },
  eulji: { lat: 37.5655342, lng: 126.9903373 },
  bukchon: { lat: 37.5804, lng: 126.9849 },
};

const apiSlots: Record<VisitSlot, ApiSlot> = {
  lunch: "lunch",
  afternoon: "afternoon",
  evening: "dinner",
  late: "late_night",
};

const screenSlots: Record<ApiSlot, VisitSlot> = {
  lunch: "lunch",
  afternoon: "afternoon",
  dinner: "evening",
  late_night: "late",
};

const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const categories = {
  korean: "food",
  bar: "food",
  other: "food",
  cafe: "cafe",
  shop: "culture",
  play: "culture",
} as const;

export type CourseReason =
  | { code: "LOCAL_TOP"; percent: number }
  | { code: "OPEN_DURING_STAY"; from: string; to: string }
  | { code: "PEAK_NOW" }
  | {
      code: "AREA_TYPE";
      type: "late_night" | "weekend_day" | "weekday_day" | "mixed";
    }
  | { code: "SIMILAR_CHOICES"; count: number };

type StopReason =
  | "NO_NEARBY_MATCH"
  | "ALL_EXCLUDED"
  | "NO_VERIFIED_MATCH"
  | "CHECK_LIMIT"
  | "VERIFICATION_UNAVAILABLE"
  | "SKIPPED_FOR_ROUTE";

type ApiPlace = Coordinate & {
  id: number;
  name: string;
  kind: CoursePlaceKind;
  googlePlaceId: string | null;
};

type ApiCourseStop = {
  position: number;
  slot: ApiSlot;
  visitTime: string;
  leaveTime: string;
  walkMinutes: number;
  hoursUnknown: boolean;
  reasons: CourseReason[];
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

type CourseRequest = {
  datasetId: string;
  visitDate: string;
  slot: VisitSlot;
  origin: Coordinate;
};

async function getData<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(new URL(path, apiBase), { signal });
  if (!response.ok) throw new Error(`Odyssey API returned ${response.status}`);
  const payload = (await response.json()) as
    { success: true; data: T } | { success: false; data: null };
  if (!payload.success || payload.data == null)
    throw new Error("Odyssey API did not return data");
  return payload.data;
}

/** Return the departure point for a selected area in the course API. */
export function courseOrigin(area: DiscoveryArea): Coordinate {
  return origins[area];
}

/** Read the newest published batch ID from the v2 meta response. */
export async function getCourseDataset(signal: AbortSignal): Promise<string> {
  const { datasets } = await getData<{ datasets: { id: string }[] }>(
    "/api/v2/meta",
    signal,
  );
  const dataset = datasets[0];
  if (!dataset?.id) throw new Error("No published recommendation dataset");
  return dataset.id;
}

/** Map the Seoul calendar date and departure slot to the course endpoint parameters. */
export function courseSearchParams(request: CourseRequest): URLSearchParams {
  const day = new Date(`${request.visitDate}T00:00:00Z`).getUTCDay();
  const weekday = weekdays[day];
  if (!weekday) throw new Error("Invalid course date");
  return new URLSearchParams({
    datasetId: request.datasetId,
    weekday,
    startSlot: apiSlots[request.slot],
    lat: String(request.origin.lat),
    lng: String(request.origin.lng),
  });
}

function coursePlace(place: ApiPlace): LocalPlace {
  return {
    id: mapApiIdToDiscovery(place.id),
    name: place.name,
    koreanName: place.name,
    area: null,
    category: categories[place.kind],
    courseKind: place.kind,
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
  const data = await getData<ApiCourse>(
    `/api/v2/course-recommendations?${courseSearchParams(request)}`,
    signal,
  );
  return {
    status: data.status,
    datasetId: data.context.datasetId,
    seed: data.seed,
    route: data.stops.map(({ slot, place, ...stop }) => ({
      ...stop,
      slot: screenSlots[slot],
      place: coursePlace(place),
      distanceMeters: place.distanceMeters,
    })),
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
  signal: AbortSignal,
): Promise<DiscoveryPlaceDetail> {
  const place = coursePlace(
    await getData<ApiPlace>(`/api/v2/places/${encodeURIComponent(id)}`, signal),
  );
  const empty = { ko: "", en: "", ja: "", zh: "" };
  return {
    place,
    photos: [],
    summaries: empty,
    descriptions: empty,
    sourceUrl: googleMapsPlaceUrl(place),
    photoCredits: [],
  };
}
