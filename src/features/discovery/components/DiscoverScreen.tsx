"use client";
import type * as React from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { isOverlapScope } from "../../map/geometry";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { discoveryCopy } from "../recommendation-analysis";
import { DiscoveryControls } from "./DiscoveryControls";
import { FeaturedCarousel } from "./FeaturedCarousel";
import { renderPlaceRow } from "./PlaceRow";
import { ResourceNotice } from "./ResourceNotice";
type Props = Pick<
  DiscoveryController,
  | "kind"
  | "language"
  | "name"
  | "openPlace"
  | "query"
  | "scroll"
  | "resetFilters"
  | "t"
  | "visible"
  | "view"
  | "mapId"
  | "status"
  | "retry"
  | "featuredId"
  | "setFeaturedId"
  | "modal"
  | "clearMapScope"
  | "mapScope"
  | "dataMonthLabel"
  | "areaName"
> &
  React.ComponentProps<typeof DiscoveryControls> & { mapScopeActive?: boolean };
export function DiscoverScreen(props: Props) {
  const { query, scroll, resetFilters, t, visible, status, retry, language } =
    props;
  return (
    <div key="places" className="local-content local-places" ref={scroll}>
      <DiscoveryControls {...props} />
      {props.dataMonthLabel && status === "success" && (
        <p className="local-data-month">{props.dataMonthLabel}</p>
      )}
      {props.mapScopeActive && (
        <div className="local-scope-row">
          <span>
            {isOverlapScope(props.mapScope)
              ? t("Overlapping places", "겹친 장소")
              : t("Selected area", "선택한 구역")}{" "}
            · {visible.length}
          </span>
          <button onClick={props.clearMapScope}>
            {t("Show all", "전체 보기")}
          </button>
        </div>
      )}
      <h1 className="local-sr-only">
        {query ? t("Search results", "검색 결과") : t("Nearby", "주변 장소")}
      </h1>
      {status === "loading" || status === "error" ? (
        <ResourceNotice status={status} retry={retry} t={t} />
      ) : visible.length > 0 ? (
        query || props.mapScopeActive ? (
          <div className="local-place-list">
            {visible.map((p) => renderPlaceRow(props, p))}
          </div>
        ) : (
          <>
            <h2 className="local-section-title">
              {discoveryCopy[language].featured}
            </h2>
            <FeaturedCarousel
              key={visible
                .slice(0, 5)
                .map((p) => p.id)
                .join(",")}
              {...props}
              places={visible.slice(0, 5)}
            />
            {visible.length > 1 && (
              <h2 className="local-section-title">
                {t("More places", "더 둘러보기")}
              </h2>
            )}
            <div className="local-place-list">
              {visible.slice(1).map((p) => renderPlaceRow(props, p))}
            </div>
          </>
        )
      ) : (
        <div className="local-empty">
          <LocalIcon name="search" size={28} />
          <h2>{t("No places found", "찾는 장소가 없어요")}</h2>
          <p>
            {t("Try another area or filter.", "지역이나 필터를 바꿔보세요.")}
          </p>
          <button className="local-secondary" onClick={resetFilters}>
            {t("Reset filters", "필터 초기화")}
          </button>
        </div>
      )}
    </div>
  );
}
