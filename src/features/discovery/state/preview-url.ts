import type { SheetState } from "../../map/sheet-motion.ts";
import { readSpacePreferences } from "../filters.ts";
import { languages } from "../localization.ts";
import type {
  AreaActivity,
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
import { readDiscoveryUrl } from "./url-state.ts";

export type PreviewUrlState = {
  view: DiscoveryView;
  area: DiscoveryArea;
  currentArea: boolean;
  place: string | null;
  modal: Modal;
  sheet?: SheetState;
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
  spaces: readonly SpacePreference[];
};

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
  const stop = params.get("sheet");
  const linkedSlot = params.get("slot");
  const slot = visitSlots.includes(linkedSlot as VisitSlot)
    ? (linkedSlot as VisitSlot)
    : undefined;
  const autoTime = slot === undefined;
  const day = Math.max(0, Math.min(6, Number(params.get("day")) || 0));
  const linkedActivity = params.get("activity");
  const linkedCategory = params.get("category");

  return {
    view: state.view === "map" ? "map" : "discover",
    area: params.has("area") ? state.area : "jongno",
    currentArea: !params.has("area") || state.area === "jongno",
    place: state.place,
    modal: ["area", "filters", "time", "menu"].includes(panel ?? "")
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
    category:
      linkedCategory === "cafe" || linkedCategory === "food"
        ? linkedCategory
        : "all",
    language: params.has("lang")
      ? state.language
      : languages.includes(storedLanguage as DiscoveryLanguage)
        ? (storedLanguage as DiscoveryLanguage)
        : "en",
  };
}

/** 적용된 프리뷰 상태를 기존 replaceState의 키 순서로 직렬화합니다.
 * @param state 현재 화면, 선택 장소와 적용 조건
 * @returns 기본값과 자동 일시를 생략한 URL 검색 매개변수
 */
export function serializePreviewUrl(
  state: PreviewUrlSelection,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("view", state.view);
  params.set("area", state.area);
  if (state.place) params.set("place", state.place);
  if (state.language !== "en") params.set("lang", state.language);
  if (state.query) params.set("q", state.query);
  if (state.category !== "all") params.set("category", state.category);
  if (!state.autoTime) {
    params.set("slot", state.slot);
    params.set("day", String(state.day));
  }
  if (state.activity !== "any") params.set("activity", state.activity);
  if (state.spaces.length) params.set("space", state.spaces.join(","));
  if (state.modal) params.set("panel", state.modal);
  if (state.view === "map") params.set("sheet", state.sheet);
  return params;
}
