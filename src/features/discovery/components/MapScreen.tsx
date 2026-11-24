"use client";
import type * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { MapViewportInsets } from "../../map/controller";
import ExploreMap from "../../map/ExploreMap";
import PlaceSheet from "../../map/PlaceSheet";
import { sheetHeights, sheetHeightsForSpace } from "../../map/sheet-motion";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { placeCount } from "../localization";
import type { Coordinate } from "../model";
import { DiscoveryControls } from "./DiscoveryControls";
import { LanguageButton } from "./LanguageButton";
import { renderPlaceRow } from "./PlaceRow";
import { Photo } from "./PlacePhoto";
import { ResourceNotice } from "./ResourceNotice";
import { SearchHeader } from "./SearchHeader";
type Props = Pick<
  DiscoveryController,
  | "language"
  | "mapCamera"
  | "mapFocusRequest"
  | "mapId"
  | "mapPlaces"
  | "mapScope"
  | "mapSelected"
  | "selected"
  | "autoCourse"
  | "courseMapStops"
  | "navigate"
  | "openFilters"
  | "liveRecommendations"
  | "openPlace"
  | "selectMapGroup"
  | "selectMapPlace"
  | "clearMapScope"
  | "setSheet"
  | "sheet"
  | "t"
  | "visible"
  | "view"
  | "name"
  | "kind"
  | "status"
  | "retry"
> &
  React.ComponentProps<typeof DiscoveryControls> & {
    currentLocation: Coordinate | null;
    onLocate: (point: Coordinate) => void;
    viewportScale: number;
    desktop: boolean;
    showCourse: boolean;
  } & React.ComponentProps<typeof SearchHeader>;
const desktopInsets: MapViewportInsets = { top: 76, bottom: 48 };
export function MapScreen(props: Props) {
  const {
    language,
    mapCamera,
    mapFocusRequest,
    mapId,
    mapPlaces,
    mapScope,
    mapSelected,
    openFilters,
    openPlace,
    currentLocation,
    onLocate,
    viewportScale,
    selectMapGroup,
    selectMapPlace,
    clearMapScope,
    setSheet,
    sheet,
    t,
    visible,
    status,
    retry,
    desktop,
    showCourse,
    autoCourse,
    courseMapStops,
    selected,
    navigate,
    name,
    kind,
  } = props;
  const page = useRef<HTMLDivElement>(null);
  const context = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{
    insets: MapViewportInsets;
    maxSheetHeight: number;
    courseContentHeight?: number;
  } | null>(null);
  useLayoutEffect(() => {
    const root = page.current;
    const controls = context.current;
    const panel = root?.querySelector<HTMLElement>(".local-place-sheet");
    if (desktop || !root?.closest(".local-web") || !controls || !panel) return;
    const courseContent = showCourse
      ? panel.querySelector<HTMLElement>(
          ".local-map-course-list, .local-empty-map",
        )
      : null;
    const listLayer = courseContent?.closest<HTMLElement>(
      ".local-sheet-list-layer",
    );

    const measure = () => {
      const top = controls.offsetTop + controls.offsetHeight + 8;
      const bottom = Number.parseFloat(getComputedStyle(panel).bottom) || 0;
      const remaining = root.clientHeight - bottom - top;
      const mapSpace =
        Number.parseFloat(
          getComputedStyle(root).getPropertyValue(
            "--local-map-sheet-clearance",
          ),
        ) || 0;
      const maxSheetHeight = Math.min(
        sheetHeights.expanded,
        Math.max(sheetHeights.collapsed, remaining - mapSpace),
      );
      const layerStyle = listLayer && getComputedStyle(listLayer);
      const courseContentHeight =
        courseContent && layerStyle
          ? courseContent.offsetHeight +
            parseFloat(layerStyle.top) +
            parseFloat(layerStyle.bottom) +
            2
          : undefined;
      setLayout((previous) =>
        previous?.maxSheetHeight === maxSheetHeight &&
        previous.insets.top === top &&
        previous.insets.bottom === bottom &&
        previous.courseContentHeight === courseContentHeight
          ? previous
          : { insets: { top, bottom }, maxSheetHeight, courseContentHeight },
      );
    };

    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    resize.observe(controls);
    if (courseContent) resize.observe(courseContent);
    return () => resize.disconnect();
  }, [desktop, showCourse, courseMapStops.length]);

  const maximumHeight = layout?.maxSheetHeight ?? sheetHeights.expanded;
  const courseContentHeight = showCourse
    ? layout?.courseContentHeight
    : undefined;
  const heights = sheetHeightsForSpace(maximumHeight, courseContentHeight);
  const displayed = showCourse ? courseMapStops : mapPlaces;
  const highlighted = selected ?? (showCourse ? null : mapSelected);
  return (
    <div
      ref={page}
      className={`local-content local-map-page ${showCourse ? "is-course-map" : ""}`}
      style={
        !desktop && layout
          ? ({
              "--local-map-measured-top": `${layout.insets.top}px`,
            } as React.CSSProperties)
          : undefined
      }
      role="region"
      aria-label={
        showCourse
          ? t("Course map", "코스 지도")
          : t("Map of nearby places", "주변 장소 지도")
      }
    >
      <ExploreMap
        memory={mapCamera}
        scope={mapScope}
        onGroupSelect={selectMapGroup}
        places={visible}
        selected={highlighted}
        courseStops={showCourse ? courseMapStops : undefined}
        onCourseStopSelect={openPlace}
        language={language}
        currentLocation={currentLocation}
        onLocate={onLocate}
        sheetInset={desktop ? 0 : heights[sheet]}
        viewportScale={viewportScale}
        viewportInsets={desktop ? desktopInsets : layout?.insets}
        focusSelected={Boolean(selected || (!showCourse && mapId))}
        focusRequest={mapFocusRequest}
        onSelect={desktop ? openPlace : selectMapPlace}
      />
      <div className="local-map-context" ref={context}>
        {desktop ? (
          <div className="local-desktop-map-title">
            <LocalIcon name={showCourse ? "route" : "map"} size={18} />
            <span>
              {showCourse
                ? t("Course map", "코스 지도")
                : t("Map of nearby places", "주변 장소 지도")}
            </span>
          </div>
        ) : showCourse ? (
          <div className="local-course-map-header">
            <button
              type="button"
              className="local-course-map-back"
              aria-label={t("Back to course", "코스로 돌아가기")}
              onClick={() => navigate("course")}
            >
              <LocalIcon name="chevron-left" size={19} />
              <span>{t("Course map", "코스 지도")}</span>
            </button>
            <LanguageButton
              className="local-course-language"
              label={t("Choose language", "언어 선택")}
              onClick={() => props.setModal("menu")}
            />
          </div>
        ) : (
          <div className="local-map-mobile-tools">
            <SearchHeader {...props} />
            <DiscoveryControls {...props} />
          </div>
        )}
      </div>
      {!desktop && (
        <PlaceSheet
          state={sheet}
          onStateChange={setSheet}
          scale={viewportScale}
          maximumHeight={maximumHeight}
          contentHeight={courseContentHeight}
          language={language}
          label={showCourse ? t("Visit order", "방문 순서") : undefined}
          summary={
            <button
              className="local-sheet-summary"
              onClick={() => setSheet("half")}
              aria-label={
                showCourse
                  ? t("Visit order", "방문 순서")
                  : placeCount(language, displayed.length, true)
              }
            >
              <span className="local-sheet-thumbnails" aria-hidden="true">
                {displayed.slice(0, 3).map((p) => (
                  <Photo key={p.id} place={p} />
                ))}
              </span>
              <strong>
                {showCourse
                  ? t("Visit order", "방문 순서")
                  : placeCount(language, displayed.length)}
              </strong>
              <LocalIcon name="chevron-right" size={16} />
            </button>
          }
        >
          {mapScope && !showCourse && (
            <div className="local-scope-row">
              <span>
                {t("Selected area", "선택한 구역")} {mapPlaces.length}
              </span>
              <button onClick={clearMapScope}>
                {t("Show all", "전체 보기")}
              </button>
            </div>
          )}
          <div className="local-sheet-scroll">
            {showCourse ? (
              courseMapStops.length ? (
                <ol
                  className="local-map-course-list"
                  aria-label={t("Visit order", "방문 순서")}
                >
                  {courseMapStops.map((place) => (
                    <li key={place.id}>
                      <button
                        className="local-course-stop-detail"
                        onClick={() => openPlace(place)}
                      >
                        <span className="local-course-pin" aria-hidden="true">
                          {place.position}
                        </span>
                        <Photo
                          place={place}
                          decorative
                          caption={(attribution) => (
                            <span className="local-place-info">
                              <strong>{name(place)}</strong>
                              <span>{kind(place)}</span>
                              {attribution}
                            </span>
                          )}
                        />
                        <LocalIcon name="chevron-right" size={16} />
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="local-empty-map" role="status">
                  {autoCourse.status === "loading"
                    ? t("Loading places…", "장소를 불러오는 중…")
                    : autoCourse.status === "error"
                      ? t("Could not load places", "장소를 불러오지 못했어요")
                      : t(
                          "No course for these conditions",
                          "이 조건에 맞는 코스가 없어요",
                        )}
                  {autoCourse.status === "error" && (
                    <button
                      type="button"
                      className="local-secondary"
                      onClick={autoCourse.retry}
                    >
                      {t("Try again", "다시 시도")}
                    </button>
                  )}
                </div>
              )
            ) : status === "loading" || status === "error" ? (
              <ResourceNotice status={status} retry={retry} t={t} />
            ) : mapPlaces.length ? (
              mapPlaces.map((p) =>
                renderPlaceRow(props, p, () => {
                  openPlace(p);
                }),
              )
            ) : (
              <div className="local-empty-map">
                {t("No places found", "장소가 없어요")}
                <button
                  className="local-secondary"
                  onClick={
                    props.liveRecommendations
                      ? () => props.setModal("area")
                      : openFilters
                  }
                >
                  {props.liveRecommendations
                    ? t("Choose area", "지역 선택")
                    : t("Edit filters", "필터 변경")}
                </button>
              </div>
            )}
          </div>
        </PlaceSheet>
      )}
    </div>
  );
}
