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
import { DiscoveryControls } from "./DiscoveryControls";
import { Photo } from "./PlacePhoto";
import { renderPlaceRow } from "./PlaceRow";
import { ResourceNotice } from "./ResourceNotice";
type Props = Pick<
  DiscoveryController,
  | "language"
  | "mapCamera"
  | "mapId"
  | "mapPlaces"
  | "mapScope"
  | "mapSelected"
  | "openFilters"
  | "openPlace"
  | "origin"
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
  React.ComponentProps<typeof DiscoveryControls> & { viewportScale: number };
export function MapScreen(props: Props) {
  const {
    language,
    mapCamera,
    mapId,
    mapPlaces,
    mapScope,
    mapSelected,
    openFilters,
    openPlace,
    origin,
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
  } = props;
  const page = useRef<HTMLDivElement>(null);
  const context = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{
    insets: MapViewportInsets;
    maxSheetHeight: number;
  } | null>(null);
  useLayoutEffect(() => {
    const root = page.current;
    const controls = context.current;
    const panel = root?.querySelector<HTMLElement>(".local-place-sheet");
    if (!root?.closest(".local-web") || !controls || !panel) return;

    const measure = () => {
      const top = controls.offsetTop + controls.offsetHeight + 8;
      const bottom = Number.parseFloat(getComputedStyle(panel).bottom) || 0;
      const maxSheetHeight = Math.min(
        sheetHeights.expanded,
        root.clientHeight - bottom - top,
      );
      setLayout((previous) =>
        previous?.maxSheetHeight === maxSheetHeight &&
        previous.insets.top === top &&
        previous.insets.bottom === bottom
          ? previous
          : { insets: { top, bottom }, maxSheetHeight },
      );
    };

    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(root);
    resize.observe(controls);
    return () => resize.disconnect();
  }, []);

  const maximumHeight = layout?.maxSheetHeight ?? sheetHeights.expanded;
  const heights = sheetHeightsForSpace(maximumHeight);
  return (
    <div key="map" ref={page} className="local-content local-map-page">
      <ExploreMap
        memory={mapCamera}
        scope={mapScope}
        onGroupSelect={selectMapGroup}
        places={visible}
        selected={mapSelected}
        language={language}
        origin={origin}
        sheetInset={heights[sheet]}
        viewportScale={viewportScale}
        viewportInsets={layout?.insets}
        focusSelected={Boolean(mapId)}
        onSelect={selectMapPlace}
      />
      <div className="local-map-context" ref={context}>
        <DiscoveryControls {...props} />
      </div>
      <PlaceSheet
        state={sheet}
        onStateChange={setSheet}
        scale={viewportScale}
        maximumHeight={maximumHeight}
        language={language}
        summary={
          <button
            className="local-sheet-summary"
            onClick={() => setSheet("half")}
            aria-label={placeCount(language, mapPlaces.length, true)}
          >
            <span className="local-sheet-thumbnails" aria-hidden="true">
              {mapPlaces.slice(0, 3).map((p) => (
                <Photo key={p.id} place={p} />
              ))}
            </span>
            <strong>{placeCount(language, mapPlaces.length)}</strong>
            <LocalIcon name="chevron-right" size={16} />
          </button>
        }
      >
        {mapScope && (
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
          {status === "loading" || status === "error" ? (
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
              <button className="local-secondary" onClick={openFilters}>
                {t("Edit filters", "필터 변경")}
              </button>
            </div>
          )}
        </div>
      </PlaceSheet>
    </div>
  );
}
