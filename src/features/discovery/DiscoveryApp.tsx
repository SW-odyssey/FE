"use client";

import { useState } from "react";
import { LocalIcon } from "../../components/ui/LocalIcon";
import { DiscoverScreen } from "./components/DiscoverScreen";
import { DiscoveryNavigation } from "./components/DiscoveryNavigation";
import { DiscoveryOverlay } from "./components/DiscoveryOverlay";
import { LiquidGlassFilter } from "./components/LiquidGlassFilter";
import { MapScreen } from "./components/MapScreen";
import { PlaceDetail } from "./components/PlaceDetail";
import { ResourceNotice } from "./components/ResourceNotice";
import { SearchHeader } from "./components/SearchHeader";
import type { DiscoveryDataSource } from "./data";
import { useCompactNavigation } from "./hooks/useCompactNavigation";
import { useDiscoveryController } from "./hooks/useDiscoveryController";
import type { Coordinate } from "./model";

export default function DiscoveryApp({
  source,
  previewScale,
}: {
  source?: DiscoveryDataSource;
  previewScale?: number;
}) {
  const controller = useDiscoveryController(source);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const {
    shell,
    scroll,
    view,
    selected,
    selectedId,
    detailStatus,
    retry,
    closePlace,
    t,
    toast,
    modal,
  } = controller;
  const isDetail = Boolean(selectedId);
  const isMap = view === "map" && !isDetail;
  const navigation = useCompactNavigation(view);

  return (
    <main
      ref={shell}
      onScrollCapture={navigation.onScroll}
      // The device frame (/guide) uses the same web layout as the real app.
      className={`local-shell local-refined local-web ${isMap ? "is-map-mode" : ""}`}
      style={
        previewScale === undefined
          ? undefined
          : {
              transform: `scale(${previewScale})`,
              left: 10 * previewScale,
              top: 10 * previewScale,
            }
      }
    >
      <LiquidGlassFilter />
      {previewScale !== undefined && (
        <div className="local-system-bar" aria-hidden="true" />
      )}
      {isDetail ? (
        <button
          className="local-round local-detail-back"
          onClick={closePlace}
          aria-label={t("Back to places", "목록으로 돌아가기")}
        >
          <LocalIcon name="chevron-left" size={36} />
        </button>
      ) : (
        <SearchHeader {...controller} />
      )}
      {selected ? (
        <PlaceDetail {...controller} selected={selected} key={selected.id} />
      ) : isDetail ? (
        <div className="local-content local-detail" ref={scroll}>
          <ResourceNotice status={detailStatus} retry={retry} t={t} missing />
        </div>
      ) : isMap ? (
        <MapScreen
          {...controller}
          currentLocation={currentLocation}
          onLocate={setCurrentLocation}
          viewportScale={previewScale ?? 1}
        />
      ) : (
        <DiscoverScreen {...controller} />
      )}
      {isDetail ? (
        <div className="local-detail-safe-area" aria-hidden="true" />
      ) : (
        <DiscoveryNavigation {...controller} compact={navigation.compact} />
      )}
      {modal && <DiscoveryOverlay {...controller} />}
      {toast && (
        <div className="local-toast" role="status">
          {toast}
        </div>
      )}
      {previewScale !== undefined && (
        <div className="local-device-home" aria-hidden="true" />
      )}
    </main>
  );
}
