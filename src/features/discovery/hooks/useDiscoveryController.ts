"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MapCamera } from "../../map/controller";
import type { MapPlaceGroup } from "../../map/geometry";
import { inMapScope } from "../../map/geometry";
import { type SheetState } from "../../map/sheet-motion";
import { previewDataSource, type DiscoveryDataSource } from "../data";
import { spacePreferences } from "../filters";
import { dateLocales, localText } from "../localization";
import type { LocalPlace } from "../model";
import {
  type AreaActivity,
  type Coordinate,
  type DiscoveryArea,
  type DiscoveryCategory,
  type DiscoveryLanguage,
  type SpacePreference,
  type VisitSlot,
} from "../model";
import {
  areaLabels,
  LANGUAGE_KEY,
  slotLabels,
  type Modal,
  type VisitTimeChoice,
} from "../presentation";
import { readPreviewUrl, serializePreviewUrl } from "../state/preview-url";
import { seoulHour, visitDate } from "../visit-date";
import { slotAt } from "../visit-time";
import { useDialogLifecycle } from "./useDialogLifecycle";
import { useDiscoveryData } from "./useDiscoveryData";
import { usePreviewViewport } from "./usePreviewViewport";
/** Owns applied/draft state, navigation and restoration for the preview. */
export function useDiscoveryController(
  source: DiscoveryDataSource = previewDataSource,
) {
  const [restored, setRestored] = useState(false);
  const [view, setView] = useState<"discover" | "map">("discover");
  const [language, setLanguage] = useState<DiscoveryLanguage>("en");
  const [area, setArea] = useState<DiscoveryArea>("jongno");
  const [currentArea, setCurrentArea] = useState(true);
  const [category, setCategory] = useState<DiscoveryCategory>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [mapScope, setMapScope] = useState<string | null>(null);
  const readingPositions = useRef({ discover: 0, map: 0 });
  const mapCamera = useRef<MapCamera | null>(null);
  const shell = useRef<HTMLElement>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [sheet, setSheet] = useState<SheetState>("half");
  const [clock, setClock] = useState(new Date("2026-10-14T15:20:00+09:00"));
  const origin: Coordinate | null = null;
  const [autoTime, setAutoTime] = useState(true);
  const [day, setDay] = useState(0);
  const [slot, setSlot] = useState<VisitSlot>("afternoon");
  const [activity, setActivity] = useState<AreaActivity>("any");
  const [draftActivity, setDraftActivity] = useState(activity);
  const [spaces, setSpaces] = useState<SpacePreference[]>([]);
  const [draftSpaces, setDraftSpaces] = useState<SpacePreference[]>([]);
  const [draftTime, setDraftTime] = useState<VisitTimeChoice>({
    autoTime: true,
    day: 0,
    slot: "afternoon",
  });
  const [draftDay, setDraftDay] = useState(0);
  const [draftSlot, setDraftSlot] = useState<VisitSlot>("afternoon");
  const [timeReturn, setTimeReturn] = useState<"filters" | null>(null);
  const [toast, setToast] = useState("");

  const { stage, phoneScale, viewportReady } = usePreviewViewport();
  const scroll = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLElement>(null);
  const { closingModal, dismissSheet } = useDialogLifecycle({
    modal,
    timeReturn,
    dialog,
    setModal,
    onDismiss: closeModal,
  });
  const sourceRef = useRef(source);
  useLayoutEffect(() => {
    sourceRef.current = source;
  }, [source]);
  const ko = language === "ko";
  const t = (en: string, kr: string) => localText(language, en, kr);
  const currentSlot = autoTime ? slotAt(seoulHour(clock)) : slot;
  const draftCurrentSlot = draftTime.autoTime
    ? slotAt(seoulHour(clock))
    : draftTime.slot;
  const name = (p: LocalPlace) => (ko ? p.koreanName : p.name);
  const kind = (p: LocalPlace) =>
    p.category === "cafe" ? t("Café", "카페") : t("Restaurant", "음식점");

  /* eslint-disable react-hooks/set-state-in-effect -- 주소 기록과 기기 시계에서 초기 상태를 복원합니다. */
  useEffect(() => {
    const restore = () => {
      let storedLanguage: string | null = null;
      try {
        storedLanguage = localStorage.getItem(LANGUAGE_KEY);
      } catch {
        /* Use URL/default language if storage is unavailable. */
      }
      const state = readPreviewUrl(
        window.location.search,
        new Date(),
        storedLanguage,
      );
      setView(state.view);
      setArea(state.area);
      setCurrentArea(state.currentArea);
      const place = sourceRef.current.snapshot?.getPlace(
        state.place ?? "",
      )?.place;
      setSelectedId(
        sourceRef.current.snapshot
          ? place && place.category !== "culture" && place.id !== "nogari"
            ? state.place
            : null
          : state.place,
      );
      setModal(state.modal);
      if (state.sheet) setSheet(state.sheet);
      setQuery(state.query);
      setAutoTime(state.autoTime);
      if (state.slot) setSlot(state.slot);
      setDay(state.day);
      setDraftDay(state.day);
      setDraftSlot(state.draftTime.slot);
      setDraftTime(state.draftTime);
      setActivity(state.activity);
      setDraftActivity(state.activity);
      setSpaces(state.spaces);
      setDraftSpaces(state.spaces);
      setCategory(state.category);
      setLanguage(state.language);
    };
    restore();
    setRestored(true);
    setClock(new Date());
    const interval = setInterval(() => setClock(new Date()), 60000);
    window.addEventListener("popstate", restore);
    return () => {
      clearInterval(interval);
      window.removeEventListener("popstate", restore);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!restored) return;
    const params = serializePreviewUrl({
      view,
      area,
      place: selectedId,
      language,
      query,
      category,
      autoTime,
      slot,
      day,
      activity,
      spaces,
      modal,
      sheet,
    });
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params}`,
    );
  }, [
    restored,
    view,
    area,
    selectedId,
    language,
    query,
    category,
    autoTime,
    slot,
    day,
    activity,
    spaces,
    modal,
    sheet,
  ]);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timeout);
  }, [toast]);
  useLayoutEffect(() => {
    const node =
      selectedId || view === "discover"
        ? scroll.current
        : shell.current?.querySelector<HTMLElement>(".local-sheet-scroll");
    node?.scrollTo({
      top: selectedId ? 0 : readingPositions.current[view],
      behavior: "instant",
    });
  }, [view, selectedId]);
  /* eslint-disable react-hooks/exhaustive-deps -- 상세 복귀의 selectedId 변경은 바로 위 복원 효과가 처리하고, 필터 변경 때만 읽던 위치를 초기화합니다. */
  useLayoutEffect(() => {
    readingPositions.current = { discover: 0, map: 0 };
    if (!selectedId) {
      scroll.current?.scrollTo({ top: 0 });
      shell.current?.querySelector(".local-sheet-scroll")?.scrollTo({ top: 0 });
    }
  }, [area, category, query, activity, spaces, currentSlot, mapScope]);
  /* eslint-enable react-hooks/exhaustive-deps */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 적용 조건이 바뀌면 이전 셀 선택 범위를 해제합니다.
    setMapScope(null);
  }, [area, category, query, activity, spaces, currentSlot]);

  const data = useDiscoveryData({
    source,
    query: {
      area,
      category,
      query,
      slot: currentSlot,
      activity,
      origin,
      spaces,
      visitDate: visitDate(clock, autoTime ? 0 : day),
    },
    draftQuery: {
      area,
      category,
      query,
      slot: draftCurrentSlot,
      activity: draftActivity,
      origin,
      spaces: draftSpaces,
      visitDate: visitDate(clock, draftTime.autoTime ? 0 : draftTime.day),
    },
    selectedId,
  });
  const {
    visible,
    draftCount,
    selected,
    photosFor,
    status,
    draftStatus,
    detailStatus,
    retry,
  } = data;
  const summary = (place: LocalPlace) => data.summaryFor(place, language);
  const description = (place: LocalPlace) =>
    data.descriptionFor(place, language);
  const mapSelected = visible.find((p) => p.id === mapId) ?? null;
  const mapPlaces = useMemo(() => {
    return mapScope ? visible.filter((p) => inMapScope(p, mapScope)) : visible;
  }, [visible, mapScope]);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${visitDate(clock, i)}T00:00:00+09:00`);
    return i === 0
      ? t("Today", "오늘")
      : d.toLocaleDateString(dateLocales[language], {
          timeZone: "Asia/Seoul",
          weekday: "short",
          day: "numeric",
          month: "short",
        });
  });
  function visitTimeLabel(choice: VisitTimeChoice) {
    if (choice.autoTime)
      return `${t("Now", "지금")} ${slotLabels[language][slotAt(seoulHour(clock))]}`;
    const date = new Date(`${visitDate(clock, choice.day)}T00:00:00+09:00`);
    const label =
      choice.day === 0
        ? t("Today", "오늘")
        : date.toLocaleDateString(dateLocales[language], {
            timeZone: "Asia/Seoul",
            weekday: "short",
            day: "numeric",
          });
    return `${label} ${slotLabels[language][choice.slot]}`;
  }
  const timeLabel = visitTimeLabel({ autoTime, day, slot });
  const draftTimeLabel = visitTimeLabel(draftTime);
  function url(
    nextView = view,
    nextPlace = selectedId,
    nextArea = area,
    nextLang = language,
  ) {
    const p = new URLSearchParams();
    p.set("view", nextView);
    p.set("area", nextArea);
    if (nextPlace) p.set("place", nextPlace);
    if (nextLang !== "en") p.set("lang", nextLang);
    if (query) p.set("q", query);
    if (category !== "all") p.set("category", category);
    window.history.pushState({}, "", `${window.location.pathname}?${p}`);
  }
  function navigate(next: "discover" | "map") {
    rememberList();
    if (next === "map" && view !== "map") setSheet("half");
    setView(next);
    setSelectedId(null);
    setModal(null);
    url(next, null);
  }
  function openPlace(p: LocalPlace) {
    rememberList();
    setSelectedId(p.id);
    setModal(null);
    url(view, p.id);
  }
  function closePlace() {
    setSelectedId(null);
    url(view, null);
  }
  function rememberList() {
    if (selectedId) return;
    const node =
      view === "map"
        ? shell.current?.querySelector<HTMLElement>(".local-sheet-scroll")
        : scroll.current;
    readingPositions.current[view] = node?.scrollTop ?? 0;
  }
  /** 일시 휠에 진입 맥락의 값을 복사합니다.
   * @param from 필터 내부 진입이면 filters, 조건 바 진입이면 null
   * @returns 일시 시트 열기
   */
  function openTime(from: "filters" | null = null) {
    const choice = from === "filters" ? draftTime : { autoTime, day, slot };
    setDraftDay(choice.autoTime ? 0 : choice.day);
    setDraftSlot(choice.autoTime ? slotAt(seoulHour(clock)) : choice.slot);
    setTimeReturn(from);
    setModal("time");
  }
  function openFilters() {
    setDraftActivity(activity);
    setDraftSpaces(spaces);
    setDraftTime({ autoTime, day, slot });
    setTimeReturn(null);
    setModal("filters");
  }
  function chooseArea(next: DiscoveryArea) {
    setCurrentArea(false);
    setMapId(null);
    setArea(next);
    if (modal) closeModal();
    setSheet("half");
    url(view, selectedId, next);
  }
  /** 프리뷰의 내 위치는 종로 기본 영역으로 이동합니다. */
  function selectPreviewLocation() {
    chooseArea("jongno");
    setCurrentArea(true);
  }
  function chooseCategory(next: DiscoveryCategory) {
    setMapId(null);
    setCategory(next);
  }
  function chooseLanguage(next: DiscoveryLanguage) {
    setLanguage(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
    url(view, selectedId, area, next);
  }
  function toggleDraftSpace(id: SpacePreference) {
    setDraftSpaces((current) =>
      current.includes(id)
        ? current.filter((tag) => tag !== id)
        : spacePreferences.filter((tag) => tag === id || current.includes(tag)),
    );
  }
  function resetDraftFilters() {
    setDraftActivity("any");
    setDraftSpaces([]);
    setDraftTime({ autoTime: true, day: 0, slot: slotAt(seoulHour(clock)) });
  }
  function applyFilters() {
    setMapId(null);
    setMapScope(null);
    setActivity(draftActivity);
    setSpaces(draftSpaces);
    setAutoTime(draftTime.autoTime);
    setDay(draftTime.day);
    setSlot(draftTime.slot);
    closeModal();
    setSheet("half");
  }
  function resetFilters() {
    setQuery("");
    setCategory("all");
    setActivity("any");
    setSpaces([]);
    setAutoTime(true);
    setDay(0);
    setArea("all");
    setCurrentArea(false);
  }
  /** 핀 선택은 목록 강조와 스크롤을 함께 갱신합니다. */
  function selectMapPlace(place: LocalPlace) {
    setMapScope(null);
    setMapId(place.id);
    setSheet("half");
    requestAnimationFrame(() => {
      const list = shell.current?.querySelector<HTMLElement>(
        ".local-sheet-scroll",
      );
      const row = list?.querySelector<HTMLElement>(
        '.local-place-row[aria-current="true"]',
      );
      if (list && row)
        list.scrollTo({
          top: row.offsetTop - list.offsetTop,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        });
    });
  }
  function selectMapGroup(group: MapPlaceGroup) {
    setMapScope(group.id);
    setMapId(null);
    setSheet("half");
  }
  function clearMapScope() {
    setMapScope(null);
    setMapId(null);
  }
  function showPlaceOnMap(place: LocalPlace) {
    setMapId(place.id);
    setMapScope(null);
    setSheet("half");
    navigate("map");
  }
  async function copyAddress(place: LocalPlace) {
    try {
      await navigator.clipboard.writeText(place.address);
      setToast(t("Address copied", "주소를 복사했어요"));
    } catch {
      setToast(place.address);
    }
  }
  const contextAreaLabel =
    area === "ikseon" && language === "en"
      ? "Ikseon"
      : area === "all" && language === "ja"
        ? "全エリア"
        : areaLabels[language][area];
  function returnToFilters() {
    setTimeReturn(null);
    setModal("filters");
    requestAnimationFrame(() =>
      shell.current
        ?.querySelector<HTMLButtonElement>(".local-filter-visit-time")
        ?.focus({ preventScroll: true }),
    );
  }
  function closeModal() {
    if (modal === "time" && timeReturn === "filters") {
      returnToFilters();
      return;
    }
    setTimeReturn(null);
    dismissSheet();
  }
  /** 선택한 일시를 필터 임시값 또는 적용값으로 확정합니다.
   * @param choice 휠에서 고른 날짜와 슬롯 또는 현재 시간 모드
   * @returns 진입 맥락에 따른 필터 복귀 또는 일시 시트 닫기
   */
  function confirmTime(choice: VisitTimeChoice) {
    if (timeReturn === "filters") {
      setDraftTime(choice);
      returnToFilters();
      return;
    }
    setMapId(null);
    setDay(choice.day);
    setSlot(choice.slot);
    setAutoTime(choice.autoTime);
    closeModal();
  }
  return {
    activity,
    area,
    category,
    applyFilters,
    chooseArea,
    chooseCategory,
    chooseLanguage,
    clearMapScope,
    copyAddress,
    resetDraftFilters,
    resetFilters,
    selectMapPlace,
    selectMapGroup,
    showPlaceOnMap,
    toggleDraftSpace,
    status,
    draftStatus,
    detailStatus,
    retry,
    clock,
    closeModal,
    closePlace,
    closingModal,
    confirmTime,
    contextAreaLabel,
    currentArea,
    days,
    description,
    dialog,
    draftActivity,
    draftCount,
    draftDay,
    draftSlot,
    draftSpaces,
    draftTime,
    draftTimeLabel,
    kind,
    language,
    mapCamera,
    mapId,
    mapPlaces,
    mapScope,
    mapSelected,
    modal,
    name,
    navigate,
    openFilters,
    openPlace,
    openTime,
    origin,
    phoneScale,
    photosFor,
    query,
    scroll,
    selectPreviewLocation,
    selected,
    selectedId,
    setDraftActivity,
    setDraftDay,
    setDraftSlot,
    setModal,
    setQuery,
    setSheet,
    sheet,
    shell,
    spaces,
    stage,
    summary,
    t,
    timeLabel,
    timeReturn,
    toast,
    view,
    viewportReady,
    visible,
  };
}
export type DiscoveryController = ReturnType<typeof useDiscoveryController>;
