import type { SheetState } from "../../map/sheet-motion.ts";
import type { CourseOptions } from "../course.ts";
import { readSpacePreferences } from "../filters.ts";
import { languages } from "../localization.ts";
import type {
  AreaActivity,
  Coordinate,
  DiscoveryArea,
  DiscoveryCategory,
  DiscoveryLanguage,
  DiscoveryView,
  SpacePreference,
  VisitSlot,
} from "../model.ts";
import type { Modal, VisitTimeChoice } from "../presentation.ts";
import { seoulHour } from "../visit-date.ts";
import { slotAt, visitSlots } from "../visit-time.ts";
import {
  readCourseLink,
  writeCourseLink,
  type CourseLink,
} from "./course-url.ts";
import { readDiscoveryUrl } from "./url-state.ts";

export type PreviewUrlState = {
  view: DiscoveryView;
  area: DiscoveryArea;
  currentArea: boolean;
  mapSearchOrigin?: Coordinate;
  place: string | null;
  modal: Modal;
  sheet?: SheetState;
  courseMap?: true;
  courseOptions?: CourseOptions;
  courseLink?: CourseLink;
  query: string;
  autoTime: boolean;
  slot?: VisitSlot;
  day: number;
  draftTime: VisitTimeChoice;
  activity: AreaActivity;
  spaces: SpacePreference[];
  category: DiscoveryCategory;
  language: DiscoveryLanguage;
};

export type PreviewUrlSelection = Pick<
  PreviewUrlState,
  | "view"
  | "area"
  | "place"
  | "modal"
  | "query"
  | "autoTime"
  | "day"
  | "activity"
  | "category"
  | "language"
> & {
  slot: VisitSlot;
  sheet: SheetState;
  courseMap?: boolean;
  courseOptions?: CourseOptions;
  courseLink?: CourseLink;
  spaces: readonly SpacePreference[];
  mapSearchOrigin?: Coordinate | null;
};

function isPreviewFilterCategory(
  category: string | null,
): category is "cafe" | "food" {
  return category === "cafe" || category === "food";
}

/** 프리뷰 URL과 저장 언어에서 복원할 상태를 읽습니다.
 * @param search 현재 URL의 검색 문자열
 * @param now 서울 기준 자동 시간 슬롯을 계산할 시각
 * @param storedLanguage 저장소에서 읽은 언어 또는 null
 * @returns 복원 상태. 미지정 slot과 유효하지 않은 sheet는 undefined입니다.
 */
export function readPreviewUrl(
  search: string,
  now: Date,
  storedLanguage: string | null,
): PreviewUrlState {
  const state = readDiscoveryUrl(search);
  const params = new URLSearchParams(search);
  const panel = params.get("panel");
  const courseMap = state.view === "map" && params.get("layer") === "course";
  const inCourse = state.view === "course" || courseMap;
  const afternoon = params.get("afternoon");
  const courseLink = inCourse ? readCourseLink(params) : undefined;
  const stop = params.get("sheet");
  const linkedSlot = params.get("slot");
  const slot = visitSlots.includes(linkedSlot as VisitSlot)
    ? (linkedSlot as VisitSlot)
    : undefined;
  const autoTime = slot === undefined;
  const day = Math.max(0, Math.min(6, Number(params.get("day")) || 0));
  const linkedActivity = params.get("activity");
  const linkedCategory = params.get("category");
  const mapLat = params.get("mapLat");
  const mapLng = params.get("mapLng");
  const lat = Number(mapLat);
  const lng = Number(mapLng);
  const mapSearchOrigin =
    mapLat?.trim() &&
    mapLng?.trim() &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
      ? { lat, lng }
      : undefined;

  return {
    view: state.view,
    ...(courseMap && { courseMap: true as const }),
    ...(courseLink && { courseLink }),
    ...(inCourse && {
      courseOptions: {
        afternoon:
          afternoon === "mixed"
            ? "mixed"
            : afternoon === "shop" || afternoon === "browse"
              ? "shop"
              : "cafe",
        lateNight: params.get("late") === "1",
        walk: params.get("walk") === "short" ? "short" : "default",
      },
    }),
    area: params.has("area") ? state.area : "jongno",
    currentArea: !params.has("area") || state.area === "jongno",
    ...(mapSearchOrigin && { mapSearchOrigin }),
    place: state.place,
    modal:
      inCourse && panel === "filters"
        ? null
        : ["area", "filters", "time", "menu"].includes(panel ?? "")
          ? (panel as Modal)
          : null,
    sheet: ["collapsed", "half", "expanded"].includes(stop ?? "")
      ? (stop as SheetState)
      : undefined,
    query: params.get("q") ?? "",
    autoTime,
    slot,
    day,
    draftTime: { autoTime, day, slot: slot ?? slotAt(seoulHour(now)) },
    activity:
      linkedActivity === "quiet" || linkedActivity === "lively"
        ? linkedActivity
        : "any",
    spaces: readSpacePreferences(params.get("space")),
    category: isPreviewFilterCategory(linkedCategory) ? linkedCategory : "all",
    language: params.has("lang")
      ? state.language
      : languages.includes(storedLanguage as DiscoveryLanguage)
        ? (storedLanguage as DiscoveryLanguage)
        : "en",
  };
}

/** 적용된 프리뷰 상태를 기존 replaceState의 키 순서로 직렬화합니다.
 * @param state 현재 화면, 선택 장소와 적용 조건
 * @returns 선택 언어를 보존하고 기본 필터와 자동 일시는 생략한 URL 검색 매개변수
 */
export function serializePreviewUrl(
  state: PreviewUrlSelection,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("view", state.view);
  params.set("area", state.area);
  if (state.place) params.set("place", state.place);
  params.set("lang", state.language);
  if (state.query) params.set("q", state.query);
  if (state.mapSearchOrigin) {
    params.set("mapLat", String(state.mapSearchOrigin.lat));
    params.set("mapLng", String(state.mapSearchOrigin.lng));
  }
  if (isPreviewFilterCategory(state.category))
    params.set("category", state.category);
  if (!state.autoTime) {
    params.set("slot", state.slot);
    params.set("day", String(state.day));
  }
  if (state.activity !== "any") params.set("activity", state.activity);
  if (state.spaces.length) params.set("space", state.spaces.join(","));
  if (state.modal) params.set("panel", state.modal);
  if (state.view === "map") params.set("sheet", state.sheet);
  if (state.view === "map" && state.courseMap) params.set("layer", "course");
  if (state.view === "course" || (state.view === "map" && state.courseMap)) {
    const options = state.courseOptions;
    if (state.courseLink) writeCourseLink(params, state.courseLink);
    if (options && options.afternoon !== "cafe")
      params.set("afternoon", options.afternoon);
    if (options?.lateNight) params.set("late", "1");
    if (options?.walk === "short") params.set("walk", "short");
  }
  return params;
}
