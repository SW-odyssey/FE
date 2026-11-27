"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MapCamera } from "../../map/controller";
import type { MapPlaceGroup } from "../../map/geometry";
import { inMapScope } from "../../map/geometry";
import { googleMapsNeedsReload } from "../../map/google/load-sdk";
import { type SheetState } from "../../map/sheet-motion";
import { defaultCourseOptions, type CourseOptions } from "../course";
import { previewDataSource, type DiscoveryDataSource } from "../data";
import { getCoursePlaceDetail } from "../data/course-api";
import { liveDiscoveryDataSource } from "../data/live-recommendations";
import { placeSearchDelay, placeSearchTerm } from "../data/place-search";
import { isServiceArea, selectDataset } from "../data/service-meta";
import { spacePreferences } from "../filters";
import { dateLocales, localText } from "../localization";
import type { LocalPlace } from "../model";
import {
  type AreaActivity,
  type Coordinate,
  type DiscoveryArea,
  type DiscoveryCategory,
  type DiscoveryLanguage,
  type DiscoveryView,
  type SpacePreference,
  type VisitSlot,
} from "../model";
import {
  areaLabel,
  fallbackAreaIds,
  formatReferenceMonth,
  LANGUAGE_KEY,
  slotLabels,
  type Modal,
  type VisitTimeChoice,
} from "../presentation";
import type { CourseLink } from "../state/course-url";
import { readPreviewUrl, serializePreviewUrl } from "../state/preview-url";
import { seoulHour, visitDate } from "../visit-date";
import { slotAt } from "../visit-time";
import { useCourseRecommendations } from "./useCourseRecommendations";
import { useDialogLifecycle } from "./useDialogLifecycle";
import { useDiscoveryData } from "./useDiscoveryData";
import { useServiceMeta } from "./useServiceMeta";

type MapLanguageRestore = {
  language: DiscoveryLanguage;
  camera: MapCamera | null;
  currentLocation: Coordinate | null;
  mapId: string | null;
};

/** Owns applied/draft state, navigation and restoration for discovery. */
export function useDiscoveryController(
  source: DiscoveryDataSource = previewDataSource,
  desktop = false,
) {
  const liveRecommendations = source === liveDiscoveryDataSource;
  const serviceMeta = useServiceMeta(liveRecommendations);
  const meta = serviceMeta.meta;
  const [restored, setRestored] = useState(false);
  const [restoringMap, setRestoringMap] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const [view, setView] = useState<DiscoveryView>("discover");
  const [courseMap, setCourseMap] = useState(false);
  const [courseLink, setCourseLink] = useState<CourseLink>();
  const [courseOptions, setCourseOptions] = useState(defaultCourseOptions);
  const [language, setLanguage] = useState<DiscoveryLanguage>("en");
  const [area, setArea] = useState<DiscoveryArea>("jongno");
  const [currentArea, setCurrentArea] = useState(true);
  const [category, setCategory] = useState<DiscoveryCategory>("all");
  const [query, setQuery] = useState("");
  // The field updates on every keystroke; the search runs for the settled term.
  const [searchComposing, setSearchComposing] = useState(false);
  const [settledSearch, setSettledSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapId, setMapId] = useState<string | null>(null);
  const [mapFocusRequest, setMapFocusRequest] = useState(0);
  const [placeOnMap, setPlaceOnMap] = useState<LocalPlace | null>(null);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [mapScope, setMapScope] = useState<string | null>(null);
  const [mapSearchOrigin, setMapSearchOrigin] = useState<Coordinate | null>(
    null,
  );
  const readingPositions = useRef({ discover: 0, course: 0, map: 0 });
  const mapCamera = useRef<MapCamera | null>(null);
  const shell = useRef<HTMLElement>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [sheet, setSheet] = useState<SheetState>("half");
  const [clock, setClock] = useState(new Date("2026-10-14T15:20:00+09:00"));
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

  const placesScroll = useRef<HTMLDivElement>(null);
  const courseScroll = useRef<HTMLDivElement>(null);
  const detailScroll = useRef<HTMLDivElement>(null);
  const inCourse = view === "course" || (view === "map" && courseMap);
  const scroll = selectedId
    ? detailScroll
    : inCourse
      ? courseScroll
      : placesScroll;
  const dialog = useRef<HTMLElement>(null);
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
  // Links can carry an area the server no longer publishes; open all areas.
  if (meta && !isServiceArea(meta, area)) {
    setArea("all");
    setCurrentArea(false);
  }
  const typedSearch = placeSearchTerm(query);
  useEffect(() => {
    // Korean, Japanese and Chinese input methods emit partial syllables;
    // wait for composition to end, then for the typing pause.
    if (searchComposing || !typedSearch) return;
    const timer = setTimeout(
      () => setSettledSearch(typedSearch),
      placeSearchDelay,
    );
    return () => clearTimeout(timer);
  }, [typedSearch, searchComposing]);
  const searchTerm = typedSearch ? settledSearch : "";
  const ko = language === "ko";
  const t = (en: string, kr: string) => localText(language, en, kr);
  const currentSlot = autoTime ? slotAt(seoulHour(clock)) : slot;
  const draftCurrentSlot = draftTime.autoTime
    ? slotAt(seoulHour(clock))
    : draftTime.slot;
  const name = (p: Pick<LocalPlace, "name" | "koreanName">) =>
    ko ? p.koreanName : p.name;
  const kind = (p: Pick<LocalPlace, "category" | "courseKind">) =>
    p.courseKind === "bar"
      ? t("Bar", "주점")
      : p.courseKind === "shop"
        ? t("Browse shops", "구경")
        : p.courseKind === "play"
          ? t("Activity", "놀거리")
          : p.category === "cafe"
            ? t("Café", "카페")
            : p.category === "culture"
              ? t("Attraction", "볼거리")
              : t("Restaurant", "음식점");

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
      if (googleMapsNeedsReload(state.language)) {
        window.location.reload();
        return;
      }
      const resume = window.history.state?.localMapLanguageRestore as
        MapLanguageRestore | undefined;
      if (resume?.language === state.language) {
        const historyState = { ...window.history.state };
        delete historyState.localMapLanguageRestore;
        window.history.replaceState(historyState, "");
        setCurrentLocation(resume.currentLocation);
        setMapId(resume.mapId);
        if (resume.camera) {
          mapCamera.current = {
            ...resume.camera,
            restoreAfterLanguageChange: true,
          };
          setRestoringMap(true);
        }
      }
      setView(state.view);
      setCourseMap(Boolean(state.courseMap));
      if (state.view === "course" || state.courseMap)
        setCourseLink(state.courseLink);
      if (state.courseOptions) setCourseOptions(state.courseOptions);
      setArea(state.area);
      setCurrentArea(state.currentArea);
      setMapSearchOrigin(state.mapSearchOrigin ?? null);
      const place = sourceRef.current.snapshot?.getPlace(
        state.place ?? "",
      )?.place;
      setSelectedId(
        state.place &&
          (state.view === "course" || state.courseMap) &&
          /^[1-9]\d*$/.test(state.place)
          ? state.place
          : sourceRef.current.snapshot
            ? place &&
              (state.view === "course" ||
                state.courseMap ||
                place.category !== "culture") &&
              place.id !== "nogari"
              ? state.place
              : null
            : state.place,
      );
      setModal(
        sourceRef.current === liveDiscoveryDataSource &&
          state.modal === "filters"
          ? null
          : state.modal,
      );
      if (state.sheet) setSheet(state.sheet);
      setQuery(state.query);
      setAutoTime(state.autoTime);
      if (state.slot) setSlot(state.slot);
      setDay(state.day);
      setDraftDay(state.day);
      setDraftSlot(state.draftTime.slot);
      setDraftTime(state.draftTime);
      const visitActivity =
        sourceRef.current === liveDiscoveryDataSource ? "any" : state.activity;
      setActivity(visitActivity);
      setDraftActivity(visitActivity);
      const visitSpaces =
        sourceRef.current === liveDiscoveryDataSource ? [] : state.spaces;
      setSpaces((current) =>
        current.length === visitSpaces.length &&
        current.every((space, index) => space === visitSpaces[index])
          ? current
          : visitSpaces,
      );
      setDraftSpaces(visitSpaces);
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
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timeout);
  }, [toast]);
  const lastScrollTarget = useRef<{
    node: HTMLElement;
    view: DiscoveryView;
    selectedId: string | null;
  }>(null);
  useLayoutEffect(() => {
    const node =
      selectedId || view !== "map" || desktop
        ? scroll.current
        : shell.current?.querySelector<HTMLElement>(".local-sheet-scroll");
    if (!node) return;
    const previous = lastScrollTarget.current;
    if (
      previous?.view === view &&
      previous.selectedId === selectedId &&
      (previous.node === node || selectedId)
    )
      return;
    lastScrollTarget.current = { node, view, selectedId };
    node.scrollTo({
      top: selectedId ? 0 : readingPositions.current[view],
      behavior: "instant",
    });
  }, [view, selectedId, desktop, scroll]);
  /* eslint-disable react-hooks/exhaustive-deps -- 상세 복귀의 selectedId 변경은 바로 위 복원 효과가 처리하고, 필터 변경 때만 읽던 위치를 초기화합니다. */
  useLayoutEffect(() => {
    readingPositions.current = { discover: 0, course: 0, map: 0 };
    if (!selectedId) {
      scroll.current?.scrollTo({ top: 0 });
      shell.current?.querySelector(".local-sheet-scroll")?.scrollTo({ top: 0 });
    }
  }, [area, category, searchTerm, activity, spaces, currentSlot, mapScope]);
  /* eslint-enable react-hooks/exhaustive-deps */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 적용 조건이 바뀌면 이전 셀 선택 범위를 해제합니다.
    setMapScope(null);
    setPlaceOnMap(null);
  }, [area, category, searchTerm, activity, spaces, currentSlot]);

  const selectedVisitDate = visitDate(clock, autoTime ? 0 : day);
  const courseAfterHours = autoTime && currentSlot === "late";
  const courseDay = courseAfterHours && seoulHour(clock) >= 22 ? 1 : 0;
  const courseFallbackTime: VisitTimeChoice = {
    autoTime: false,
    day: courseDay,
    slot: "lunch",
  };
  const automaticCourseDate = courseAfterHours
    ? visitDate(clock, courseDay)
    : selectedVisitDate;
  const courseLocation = currentArea ? currentLocation : null;
  const courseStartSlot =
    courseLink?.startSlot ?? (courseAfterHours ? "lunch" : currentSlot);
  const autoCourse = useCourseRecommendations({
    area,
    slot: courseStartSlot,
    origin: courseLocation,
    visitDate: automaticCourseDate,
    initialLink: courseLink,
    options: courseOptions,
    language,
    meta,
    enabled: restored && inCourse,
  });
  const course =
    liveRecommendations && !meta && serviceMeta.status === "error"
      ? { ...autoCourse, status: "error" as const, retry: serviceMeta.retry }
      : autoCourse;
  const activeCourseLink = autoCourse.link ?? courseLink;
  const courseDate = activeCourseLink?.visitDate ?? automaticCourseDate;
  useEffect(() => {
    if (!restored) return;
    const params = serializePreviewUrl({
      view,
      area,
      place: selectedId,
      language,
      query,
      mapSearchOrigin,
      category,
      autoTime,
      slot,
      day,
      activity,
      spaces,
      modal,
      sheet,
      courseMap,
      courseOptions,
      courseLink: activeCourseLink,
    });
    window.history.replaceState(
      window.history.state,
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
    mapSearchOrigin,
    category,
    autoTime,
    slot,
    day,
    activity,
    spaces,
    modal,
    sheet,
    courseMap,
    courseOptions,
    activeCourseLink,
  ]);
  const courseMapStops = useMemo(
    () =>
      autoCourse.route.map(({ place, position }) => ({ ...place, position })),
    [autoCourse.route],
  );
  const appliedQuery = {
    area,
    category,
    query: searchTerm,
    slot: currentSlot,
    activity,
    origin: liveRecommendations
      ? (mapSearchOrigin ?? (currentArea ? currentLocation : null))
      : null,
    spaces,
    visitDate: selectedVisitDate,
    language,
  };
  const data = useDiscoveryData({
    source,
    queryEnabled:
      !liveRecommendations || (restored && !inCourse && Boolean(meta)),
    draftEnabled: !liveRecommendations || modal === "filters",
    query: appliedQuery,
    detailQuery: inCourse
      ? {
          ...appliedQuery,
          category: "all",
          query: "",
          slot: courseStartSlot,
          visitDate: courseDate,
          datasetId: activeCourseLink?.datasetId,
        }
      : appliedQuery,
    draftQuery: inCourse
      ? appliedQuery
      : {
          ...appliedQuery,
          slot: draftCurrentSlot,
          activity: draftActivity,
          spaces: draftSpaces,
          visitDate: visitDate(clock, draftTime.autoTime ? 0 : draftTime.day),
        },
    selectedId,
    getPlace:
      !liveRecommendations &&
      inCourse &&
      selectedId &&
      /^[1-9]\d*$/.test(selectedId)
        ? getCoursePlaceDetail
        : undefined,
  });
  const {
    visible,
    draftCount,
    selected,
    photosFor,
    draftStatus,
    detailStatus,
  } = data;
  const status =
    liveRecommendations && !meta
      ? serviceMeta.status === "error"
        ? ("error" as const)
        : ("loading" as const)
      : data.status;
  const retry = () => {
    if (liveRecommendations) serviceMeta.retry();
    data.retry();
  };
  const areaOptions: { id: DiscoveryArea; label: string }[] = [
    { id: "all", label: areaLabel("all", language) },
    ...(liveRecommendations
      ? (meta?.areas ?? []).map(({ id, name }) => ({
          id,
          label: areaLabel(id, language, name),
        }))
      : fallbackAreaIds.map((id) => ({ id, label: areaLabel(id, language) }))),
  ];
  /** @returns The localized name of a place's server area, or an empty string. */
  const areaName = (id: string | null | undefined) =>
    id
      ? areaLabel(id, language, meta?.areas.find((a) => a.id === id)?.name)
      : "";
  const monthOf = (datasetId?: string) => {
    if (!meta) return undefined;
    try {
      return selectDataset(meta, datasetId).referenceMonth;
    } catch {
      return undefined;
    }
  };
  const listReferenceMonth = monthOf();
  const courseReferenceMonth = monthOf(activeCourseLink?.datasetId);
  const mapDataPending = inCourse
    ? autoCourse.status === "loading"
    : status === "loading";
  if (restoringMap && !mapDataPending) setRestoringMap(false);
  const mapSdkEnabled = restored && (!restoringMap || !mapDataPending);
  const summary = (place: LocalPlace) => data.summaryFor(place, language);
  const analysisFor = (place: LocalPlace) => data.analyses[place.id];
  const description = (place: LocalPlace) =>
    data.descriptionFor(place, language);
  const mapVisible = useMemo(
    () =>
      (view === "map" || desktop) &&
      placeOnMap &&
      placeOnMap.id === mapId &&
      !visible.some((place) => place.id === mapId)
        ? [placeOnMap, ...visible]
        : visible,
    [view, desktop, mapId, placeOnMap, visible],
  );
  const mapSelected = mapVisible.find((p) => p.id === mapId) ?? null;
  const mapPlaces = useMemo(
    () =>
      mapScope ? mapVisible.filter((p) => inMapScope(p, mapScope)) : mapVisible,
    [mapVisible, mapScope],
  );
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
      return `${t("Now", "지금")} · ${slotLabels[language][slotAt(seoulHour(clock))]}`;
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
  const pinnedSlot = courseLink?.startSlot;
  const courseTimeLabel =
    pinnedSlot &&
    (courseDate !== automaticCourseDate ||
      pinnedSlot !== (courseAfterHours ? "lunch" : currentSlot))
      ? `${new Date(`${courseDate}T00:00:00+09:00`).toLocaleDateString(
          dateLocales[language],
          {
            timeZone: "Asia/Seoul",
            weekday: "short",
            day: "numeric",
            month: "short",
          },
        )} ${slotLabels[language][pinnedSlot]}`
      : courseAfterHours
        ? visitTimeLabel(courseFallbackTime)
        : timeLabel;
  const draftTimeLabel = visitTimeLabel(draftTime);
  function url(
    nextView = view,
    nextPlace = selectedId,
    nextArea = area,
    nextLang = language,
    mode: "push" | "replace" = "replace",
    nextCourseMap = courseMap,
  ) {
    const p = serializePreviewUrl({
      view: nextView,
      area: nextArea,
      place: nextPlace,
      language: nextLang,
      query,
      mapSearchOrigin,
      category,
      autoTime,
      slot,
      day,
      activity,
      spaces,
      modal: null,
      sheet,
      courseMap: nextCourseMap,
      courseOptions,
      courseLink: activeCourseLink,
    });
    const state = {
      ...window.history.state,
      localDiscoveryReturn:
        mode === "push" && nextPlace
          ? `${window.location.pathname}${window.location.search}`
          : null,
    };
    window.history[mode === "push" ? "pushState" : "replaceState"](
      state,
      "",
      `${window.location.pathname}?${p}`,
    );
  }
  function navigate(next: DiscoveryView, nextCourseMap = false) {
    if (next === view && !selectedId && nextCourseMap === courseMap) return;
    rememberList();
    if (next === "map" && view !== "map") setSheet("half");
    setCourseMap(nextCourseMap);
    setView(next);
    setSelectedId(null);
    setModal(null);
    url(
      next,
      null,
      area,
      language,
      selectedId ? "push" : "replace",
      nextCourseMap,
    );
  }
  function showCourseOnMap() {
    navigate("map", true);
  }
  function openPlace(p: Pick<LocalPlace, "id">) {
    rememberList();
    setSelectedId(p.id);
    setModal(null);
    url(view, p.id, area, language, "push");
  }
  function closePlace() {
    if (window.history.state?.localDiscoveryReturn) {
      window.history.back();
      return;
    }
    setSelectedId(null);
    url(view, null, area, language, "replace");
  }
  function rememberList() {
    if (selectedId) return;
    const node =
      view === "map" && !desktop
        ? shell.current?.querySelector<HTMLElement>(".local-sheet-scroll")
        : scroll.current;
    readingPositions.current[view] = node?.scrollTop ?? 0;
  }
  /** 일시 휠에 진입 맥락의 값을 복사합니다.
   * @param from 필터 내부 진입이면 filters, 조건 바 진입이면 null
   * @returns 일시 시트 열기
   */
  function openTime(from: "filters" | null = null) {
    const choice =
      from === "filters"
        ? draftTime
        : inCourse && courseAfterHours
          ? courseFallbackTime
          : { autoTime, day, slot };
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
  function changeCourseOptions(next: CourseOptions) {
    if (
      next.afternoon === courseOptions.afternoon &&
      next.lateNight === courseOptions.lateNight &&
      next.walk === courseOptions.walk
    )
      return;
    if (activeCourseLink)
      setCourseLink({
        ...activeCourseLink,
        previousStopIds: undefined,
        replacements: [],
      });
    setCourseOptions(next);
  }
  function chooseArea(next: DiscoveryArea) {
    setCourseLink(undefined);
    setCurrentArea(false);
    setMapSearchOrigin(null);
    setMapId(null);
    setArea(next);
    if (modal) closeModal();
    setSheet("half");
    url(view, selectedId, next);
  }
  /** Apply a device location selected by the user. */
  function updateDeviceLocation(point: Coordinate) {
    if (currentArea) setCourseLink(undefined);
    setCurrentLocation(point);
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
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      /* Storage can be unavailable in private browsing. */
    }
    if (googleMapsNeedsReload(next)) {
      const previousHistory = window.history.state;
      const resume: MapLanguageRestore = {
        language: next,
        camera: mapCamera.current,
        currentLocation,
        mapId,
      };
      url(view, selectedId, area, next);
      window.history.replaceState(
        { ...previousHistory, localMapLanguageRestore: resume },
        "",
      );
      window.location.reload();
      return;
    }
    if (next !== language && inCourse && activeCourseLink)
      setCourseLink(activeCourseLink);
    setLanguage(next);
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
    setCourseLink(undefined);
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
    setCourseLink(undefined);
    setQuery("");
    setCategory("all");
    setActivity("any");
    setSpaces([]);
    setAutoTime(true);
    setDay(0);
    setArea("all");
    setCurrentArea(false);
    setMapSearchOrigin(null);
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
    if (desktop && selectedId) closePlace();
  }
  function clearMapScope() {
    setMapScope(null);
    setMapId(null);
  }
  function searchMapArea({ lat, lng }: Coordinate) {
    setMapSearchOrigin({
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
    });
    setMapScope(null);
    setMapId(null);
    setPlaceOnMap(null);
  }
  function showPlaceOnMap(place: LocalPlace) {
    setMapId(place.id);
    setPlaceOnMap(place);
    setMapScope(null);
    setSheet("half");
    if (inCourse && courseMapStops.some(({ id }) => id === place.id)) {
      navigate("map", true);
    } else if (!desktop) navigate("map", false);
    else setMapFocusRequest((request) => request + 1);
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
    mapSearchOrigin && !inCourse
      ? t("Map area", "지도에서 선택")
      : area === "ikseon" && language === "en"
        ? "Ikseon"
        : area === "all" && language === "ja"
          ? "全エリア"
          : areaName(area) || areaLabel(area, language);
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
    setCourseLink(undefined);
    setMapId(null);
    setDay(choice.day);
    setSlot(choice.slot);
    setAutoTime(choice.autoTime);
    closeModal();
  }
  return {
    activity,
    analysisFor,
    liveRecommendations,
    featuredId,
    setFeaturedId,
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
    courseMap,
    courseMapStops,
    courseOptions,
    courseScroll,
    changeCourseOptions,
    courseStartSlot,
    showCourseOnMap,
    autoCourse: course,
    searchSuggestions:
      liveRecommendations &&
      searchTerm &&
      searchTerm === typedSearch &&
      status === "success"
        ? visible.slice(0, 6)
        : [],
    setSearchComposing,
    searchTerm,
    total: data.total,
    hasMore: data.hasMore,
    moreStatus: data.moreStatus,
    loadMore: data.loadMore,
    areaName,
    areaOptions,
    dataMonthLabel: listReferenceMonth
      ? formatReferenceMonth(listReferenceMonth, language)
      : "",
    courseDataMonthLabel:
      courseReferenceMonth && course.route.length
        ? formatReferenceMonth(courseReferenceMonth, language)
        : "",
    courseDate,
    courseTimeLabel,
    courseLocation,
    currentArea,
    currentLocation,
    days,
    description,
    aiSummary: data.selectedDetail?.aiSummary?.[language],
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
    mapFocusRequest,
    mapId,
    mapPlaces,
    mapScope,
    mapSearchOrigin,
    mapSdkEnabled,
    searchMapArea,
    mapSelected,
    mapVisible,
    modal,
    name,
    navigate,
    openFilters,
    openPlace,
    openTime,
    photosFor,
    placesScroll,
    query,
    scroll,
    selectPreviewLocation,
    selected,
    selectedId,
    selectedVisitDate: inCourse ? courseDate : selectedVisitDate,
    visitPattern: data.selectedDetail?.visitPattern,
    setCurrentLocation: updateDeviceLocation,
    setDraftActivity,
    setDraftDay,
    setDraftSlot,
    setModal,
    setQuery,
    setSheet,
    sheet,
    shell,
    spaces,
    summary,
    t,
    timeLabel,
    timeReturn,
    toast,
    view,
    visible,
  };
}
export type DiscoveryController = ReturnType<typeof useDiscoveryController>;
