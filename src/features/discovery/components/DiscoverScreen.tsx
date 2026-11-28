"use client";
import type * as React from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { isOverlapScope } from "../../map/geometry";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { formatLoadedCount, formatNearbyCount } from "../presentation";
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
  | "searchTerm"
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
  | "total"
  | "nearbyScope"
  | "closedTimeNotice"
  | "hasMore"
  | "moreStatus"
  | "loadMore"
  | "areaName"
  | "reasonsFor"
> &
  React.ComponentProps<typeof DiscoveryControls> & { mapScopeActive?: boolean };
export function DiscoverScreen(props: Props) {
  const { scroll, resetFilters, t, visible, status, retry, language } = props;
  const query = props.searchTerm;
  return (
    <div key="places" className="local-content local-places" ref={scroll}>
      <DiscoveryControls {...props} />
      {props.closedTimeNotice && !query && (
        <p className="local-data-month local-time-notice" role="status">
          {props.closedTimeNotice}
        </p>
      )}
      {status === "success" && !props.mapScopeActive && visible.length > 0 && (
        <p className="local-data-month" aria-live="polite">
          {[
            !query && props.nearbyScope
              ? formatNearbyCount(props.nearbyScope, visible.length, language)
              : formatLoadedCount(visible.length, props.total, language),
            // Name search is not tied to a dataset month.
            !query && props.dataMonthLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
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
            {props.hasMore && (
              <div className="local-load-more">
                {props.moreStatus === "error" && (
                  <p role="alert">
                    {t(
                      "Could not load more places",
                      "다음 장소를 불러오지 못했어요",
                    )}
                  </p>
                )}
                <button
                  type="button"
                  className="local-secondary"
                  onClick={props.loadMore}
                  disabled={props.moreStatus === "loading"}
                  aria-busy={props.moreStatus === "loading"}
                >
                  {props.moreStatus === "loading"
                    ? t("Loading more places…", "장소를 더 불러오는 중…")
                    : props.moreStatus === "error"
                      ? t("Try again", "다시 시도")
                      : t("Show more places", "장소 더 보기")}
                </button>
              </div>
            )}
          </>
        )
      ) : (
        <div className="local-empty">
          <LocalIcon name="search" size={28} />
          <h2>
            {!query && props.nearbyScope === "map"
              ? t(
                  "No places within 300 m of the map centre",
                  "지도 중심 300m 안에 추천 장소가 없어요",
                )
              : !query && props.nearbyScope === "location"
                ? t(
                    "No places within 300 m of you",
                    "내 위치 300m 안에 추천 장소가 없어요",
                  )
                : t("No places found", "찾는 장소가 없어요")}
          </h2>
          <p>
            {!query && props.nearbyScope
              ? t(
                  "Move the map and search again, or choose an area.",
                  "지도를 옮겨 다시 검색하거나 지역을 선택해 보세요.",
                )
              : t("Try another area or filter.", "지역이나 필터를 바꿔보세요.")}
          </p>
          <button className="local-secondary" onClick={resetFilters}>
            {t("Reset filters", "필터 초기화")}
          </button>
        </div>
      )}
    </div>
  );
}
