"use client";
import type { CSSProperties } from "react";
import { LocalIcon } from "../../components/ui/LocalIcon";
import { localText } from "../discovery/localization";
import type { ExploreMapProps } from "./controller";
import { inMapScope } from "./geometry";
import { MapDiagram } from "./MapDiagram";
import { hasLiveMapKey } from "./provider";
import { useDeviceLocation } from "./useDeviceLocation";
import { useExploreMap } from "./useExploreMap";
import { usePreviewMap } from "./usePreviewMap";
export type { MapCamera } from "./controller";

export default function ExploreMap(props: ExploreMapProps) {
  const {
    places,
    language,
    currentLocation,
    courseStops,
    hideCourseLine,
    onLocate,
    viewportScale = 1,
    viewportInsets,
    sheetInset = 320,
  } = props;
  const {
    element,
    provider,
    ready,
    error,
    zoom,
    retry,
    zoomBy,
    fitRecommendations,
    centerOn,
    canSearchArea,
    searchArea,
  } = useExploreMap(props);
  const displayed =
    courseStops ?? places.filter((place) => inMapScope(place, props.scope));
  const { attachFrame, ...preview } = usePreviewMap({
    enabled: !ready,
    stops: courseStops ?? places,
    numbered: Boolean(courseStops),
    top: viewportInsets?.top ?? 72,
    bottom: sheetInset + (viewportInsets?.bottom ?? 100),
    viewportScale,
    focus: props.focusSelected ? props.selected : null,
    focusRequest: props.focusRequest,
  });
  const zoomMap = (direction: -1 | 1) => {
    if (ready) zoomBy(direction);
    else preview.zoomBy(direction);
  };
  const { locate, status } = useDeviceLocation((point) => {
    onLocate(point);
    centerOn(point);
  });
  const t = (en: string, kr: string) => localText(language, en, kr);
  const locationMessage = {
    idle: "",
    locating: t("Finding you…", "내 위치를 확인하는 중…"),
    denied: t(
      "Allow location in your browser to use this button.",
      "이 버튼을 쓰려면 브라우저에서 위치를 허용해 주세요.",
    ),
    unavailable: t(
      "Could not find your location. Try again.",
      "위치를 확인하지 못했어요. 다시 시도해 주세요.",
    ),
  }[status];
  return (
    <div
      data-map-provider={provider ?? "preview"}
      className={`local-explore-map${!ready ? " is-map-fallback" : ""}`}
      style={
        {
          "--local-map-viewport-scale": viewportScale,
          "--local-map-preview-width": `${393 * viewportScale}px`,
          "--local-map-preview-height": `${852 * viewportScale}px`,
          "--local-map-preview-zoom": 1 / viewportScale,
        } as CSSProperties
      }
    >
      <div
        ref={element}
        className="local-map-canvas"
        aria-label={
          courseStops
            ? t("Course map", "코스 지도")
            : t("Map of nearby places", "주변 장소 지도")
        }
      />
      {!ready && (
        <MapDiagram
          attachFrame={attachFrame}
          map={preview}
          stops={courseStops ?? places}
          places={courseStops ? [] : places}
          numbered={Boolean(courseStops)}
          hideCourseLine={hideCourseLine}
          selectedId={props.selected?.id}
          scope={props.scope}
          onGroupSelect={props.onGroupSelect}
          language={language}
          onSelect={(stop) => {
            if (courseStops) props.onCourseStopSelect?.(stop);
            else {
              const place = places.find(({ id }) => id === stop.id);
              if (place) props.onSelect(place);
            }
          }}
        />
      )}
      <div className="local-map-chrome">
        {canSearchArea && (
          <button
            type="button"
            className="local-map-search-area"
            onClick={searchArea}
          >
            <LocalIcon name="refresh" size={17} />
            {t(
              "Search 300 m around the map centre",
              "지도 중심 300m 안에서 다시 검색",
            )}
          </button>
        )}
        <div className="local-map-notes">
          {Boolean(
            !hideCourseLine && courseStops && courseStops.length > 1,
          ) && (
            <span className="local-map-route-legend">
              {t("Straight-line connections", "직선 연결")}
            </span>
          )}
          {!ready && (
            <span className="local-map-preview-status" role="status">
              {error
                ? t("Map preview", "지도 미리보기")
                : t("Loading map…", "지도를 불러오는 중…")}
            </span>
          )}
        </div>
        {ready && (
          <div className="local-map-location-status" role="status">
            {locationMessage && (
              <div className="local-refined-map-status">
                <strong>{locationMessage}</strong>
              </div>
            )}
          </div>
        )}
        <div
          className="local-map-tools"
          role="group"
          aria-label={t("Map controls", "지도 조작")}
        >
          {ready && (
            <button
              type="button"
              className={`local-map-locate ${currentLocation ? "is-active" : ""}`}
              aria-label={t("My location", "내 위치")}
              title={t("My location", "내 위치")}
              aria-busy={status === "locating"}
              disabled={status === "locating"}
              onClick={locate}
            >
              <LocalIcon name="locate-fixed" size={21} />
            </button>
          )}
          <div className="local-map-zoom">
            <button
              type="button"
              aria-label={t("Zoom in", "확대")}
              title={t("Zoom in", "확대")}
              disabled={ready ? zoom <= 1 : !preview.canZoomIn}
              onClick={() => zoomMap(-1)}
            >
              <span
                className="local-map-step-icon is-plus"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              aria-label={t("Zoom out", "축소")}
              title={t("Zoom out", "축소")}
              disabled={ready ? zoom >= 10 : !preview.canZoomOut}
              onClick={() => zoomMap(1)}
            >
              <span className="local-map-step-icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="local-map-fit"
              aria-label={
                courseStops
                  ? t("Fit course", "코스 전체 보기")
                  : t("Fit places", "추천 장소 전체 보기")
              }
              title={
                courseStops
                  ? t("Fit course", "코스 전체 보기")
                  : t("Fit places", "추천 장소 전체 보기")
              }
              onClick={ready ? fitRecommendations : preview.fit}
              disabled={!displayed.length}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
              </svg>
            </button>
          </div>
          {error && hasLiveMapKey && (
            <button
              type="button"
              aria-label={t("Retry live map", "지도 다시 연결")}
              onClick={retry}
            >
              ↻
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
