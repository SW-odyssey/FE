"use client";
import type { CSSProperties } from "react";
import { localText } from "../discovery/localization";
import type { ExploreMapProps } from "./controller";
import { useExploreMap } from "./useExploreMap";
export type { MapCamera } from "./controller";

export default function ExploreMap(props: ExploreMapProps) {
  const { places, language, origin, viewportScale = 1 } = props;
  const {
    element,
    ready,
    error,
    zoom,
    retry,
    zoomBy,
    fitRecommendations,
    centerOnOrigin,
  } = useExploreMap(props);
  const grid = zoom <= 4;
  const t = (en: string, kr: string) => localText(language, en, kr);
  return (
    <div
      className={`local-explore-map ${grid ? "is-cell-preview" : ""}`}
      style={{ "--local-map-viewport-scale": viewportScale } as CSSProperties}
    >
      <div
        ref={element}
        style={{
          width: 393 * viewportScale,
          height: 852 * viewportScale,
          transform: `scale(${1 / viewportScale})`,
          transformOrigin: "top left",
        }}
        className="local-map-canvas"
        aria-label={t("Map of nearby places", "주변 장소 지도")}
      />
      {!ready && (
        <div className="local-refined-map-status" role="status">
          <strong>
            {error
              ? t("Map unavailable", "지도를 연결하지 못했어요")
              : t("Loading map…", "지도를 불러오는 중…")}
          </strong>
          <span>
            {t(
              "The place list is available below.",
              "아래 장소 목록은 이용할 수 있어요.",
            )}
          </span>
        </div>
      )}
      <div className="local-map-tools">
        <div className="local-map-zoom">
          <button
            aria-label={t("Zoom in", "확대")}
            disabled={!ready || zoom <= 1}
            onClick={() => zoomBy(-1)}
          >
            ＋
          </button>
          <button
            aria-label={t("Zoom out", "축소")}
            disabled={!ready || zoom >= 10}
            onClick={() => zoomBy(1)}
          >
            −
          </button>
        </div>
        {error && (
          <button
            aria-label={t("Retry live map", "지도 다시 연결")}
            onClick={retry}
          >
            ↻
          </button>
        )}
        {ready && (
          <button
            aria-label={t(
              "Show all recommended locations",
              "추천 위치 전체 보기",
            )}
            title={t("Show all recommended locations", "추천 위치 전체 보기")}
            onClick={fitRecommendations}
            disabled={!places.length}
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
            >
              <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
            </svg>
          </button>
        )}
        {origin && (
          <button
            aria-label={t("My location", "내 위치")}
            title={t("My location", "내 위치")}
            onClick={centerOnOrigin}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
