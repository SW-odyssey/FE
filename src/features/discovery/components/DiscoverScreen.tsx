"use client";
import type * as React from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { areaLabels } from "../presentation";
import { DiscoveryControls } from "./DiscoveryControls";
import { Photo } from "./PlacePhoto";
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
> &
  React.ComponentProps<typeof DiscoveryControls>;
export function DiscoverScreen(props: Props) {
  const {
    kind,
    language,
    name,
    openPlace,
    query,
    scroll,
    resetFilters,
    t,
    visible,
    status,
    retry,
  } = props;
  return (
    <div key="places" className="local-content local-places" ref={scroll}>
      <DiscoveryControls {...props} />
      <h1 className="local-sr-only">
        {query ? t("Search results", "검색 결과") : t("Nearby", "주변 장소")}
      </h1>
      {status === "loading" || status === "error" ? (
        <ResourceNotice status={status} retry={retry} t={t} />
      ) : visible.length > 0 ? (
        query ? (
          <div className="local-place-list">
            {visible.map((p) => renderPlaceRow(props, p))}
          </div>
        ) : (
          <>
            <button
              key={visible[0].id}
              className="local-featured"
              onClick={() => openPlace(visible[0])}
            >
              <Photo place={visible[0]} eager={true} />
              <span className="local-featured-copy">
                <span>
                  {areaLabels[language][visible[0].area]} {kind(visible[0])}
                </span>
                <strong>{name(visible[0])}</strong>
              </span>
              <i>
                <LocalIcon name="arrow-right" size={18} />
              </i>
            </button>
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
