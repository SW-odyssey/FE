import type { DiscoveryQuery } from "./types";
export type ApiAreaId =
  "all" | "jongno" | "ikseon" | "insadong" | "euljiro" | "myeongdong";
export type ApiSlot = "lunch" | "afternoon" | "dinner" | "late_night";
export type ApiDensity = "any" | "less_busy" | "lively";
export type ApiFoodType = "any" | "korean" | "bar";
export type ApiSince = "any" | "20" | "30" | "40";
export type ApiRecommendationsQuery = {
  areaId: ApiAreaId;
  category: "all" | "food" | "cafe";
  foodType?: ApiFoodType;
  since?: ApiSince;
  visitDate: string;
  slot: ApiSlot;
  density: ApiDensity;
  q: string;
};
export type ApiMappingIssue = {
  field: "area" | "category" | "spaces" | "visitDate" | "id";
  code: string;
  message: string;
};
export type ApiMappingResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      issues: ApiMappingIssue[];
    };
const areas = {
  all: "all",
  jongno: "jongno",
  ikseon: "ikseon",
  insa: "insadong",
  eulji: "euljiro",
} as const;
const slots = {
  lunch: "lunch",
  afternoon: "afternoon",
  evening: "dinner",
  late: "late_night",
} as const;
const densities = { any: "any", quiet: "less_busy", lively: "lively" } as const;
function isCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
/**
 * @param input Current UI selections and an explicitly derived Seoul visitDate
 * @param food Food-only API selections, emitted only for category=food
 * @returns The #28/#30 query or unresolved selections; it performs no request.
 * Bukchon and concept filters need an agreed contract. Origin and UI language
 * stay client-side. Date-range and search-length policy belong to the caller.
 */
export function mapDiscoveryQueryToApi(
  input: DiscoveryQuery,
  food: {
    foodType?: ApiFoodType;
    since?: ApiSince;
  } = {},
): ApiMappingResult<ApiRecommendationsQuery> {
  const issues: ApiMappingIssue[] = [];
  if (input.area === "bukchon")
    issues.push({
      field: "area",
      code: "UNMAPPED_AREA",
      message: "북촌의 서버 지역 범위는 합의가 필요합니다.",
    });
  if (input.category === "culture")
    issues.push({
      field: "category",
      code: "UNSUPPORTED_CATEGORY",
      message: "현재 API는 전체, 음식점과 카페를 지원합니다.",
    });
  if (input.spaces.length)
    issues.push({
      field: "spaces",
      code: "UNSUPPORTED_CONCEPT_FILTER",
      message: "컨셉 선택의 요청 규격은 합의가 필요합니다.",
    });
  if (!isCalendarDate(input.visitDate))
    issues.push({
      field: "visitDate",
      code: "VISIT_DATE_REQUIRED",
      message: "서울 기준 YYYY-MM-DD 날짜가 필요합니다.",
    });
  if (issues.length) return { ok: false, issues };
  return {
    ok: true,
    value: {
      areaId: areas[input.area as keyof typeof areas],
      category: input.category as ApiRecommendationsQuery["category"],
      ...(input.category === "food"
        ? { foodType: food.foodType ?? "any", since: food.since ?? "any" }
        : {}),
      visitDate: input.visitDate!,
      slot: slots[input.slot],
      density: densities[input.activity],
      q: input.query,
    },
  };
}
/**
 * @param input A mapped API query
 * @returns Stable query serialization containing only the eight supported keys
 */
export function serializeApiRecommendationsQuery(
  input: ApiRecommendationsQuery,
): string {
  const params = new URLSearchParams();
  for (const key of [
    "areaId",
    "category",
    "foodType",
    "since",
    "visitDate",
    "slot",
    "density",
    "q",
  ] as const) {
    const value = input[key];
    if (value !== undefined) params.set(key, value);
  }
  return params.toString();
}
/**
 * @param id UI ID from a numeric server response, not a preview slug
 * @returns A safely representable numeric path ID or an adapter issue
 */
export function mapDiscoveryIdToApi(id: string): ApiMappingResult<number> {
  if (/^-?\d+$/.test(id) && Number.isSafeInteger(Number(id)))
    return { ok: true, value: Number(id) };
  return {
    ok: false,
    issues: [
      {
        field: "id",
        code: "NUMERIC_ID_REQUIRED",
        message: "서버 장소 ID를 정확한 정수로 연결해 주세요.",
      },
    ],
  };
}
/**
 * @param id Numeric ID returned by the server
 * @returns Its stable UI string representation, preserving the current screen model
 */
export function mapApiIdToDiscovery(id: number): string {
  if (!Number.isSafeInteger(id))
    throw new TypeError("API ID must be a safely representable integer");
  return String(id);
}
