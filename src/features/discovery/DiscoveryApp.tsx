"use client";

import { LocalIcon } from "../../components/ui/LocalIcon";
import { DiscoverScreen } from "./components/DiscoverScreen";
import { DiscoveryNavigation } from "./components/DiscoveryNavigation";
import { DiscoveryOverlay } from "./components/DiscoveryOverlay";
import { MapScreen } from "./components/MapScreen";
import { PlaceDetail } from "./components/PlaceDetail";
import { ResourceNotice } from "./components/ResourceNotice";
import { SearchHeader } from "./components/SearchHeader";
import type { DiscoveryDataSource } from "./data";
import { useDiscoveryController } from "./hooks/useDiscoveryController";

export default function DiscoveryApp({
  source,
  previewScale,
}: {
  source?: DiscoveryDataSource;
  previewScale?: number;
}) {
  const controller = useDiscoveryController(source);
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

  return (
    <main
      ref={shell}
      className={`local-shell local-refined ${previewScale === undefined ? "local-web" : ""} ${isMap ? "is-map-mode" : ""}`}
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
      {previewScale !== undefined && (
        <div className="local-system-bar" aria-hidden="true" />
      )}
      {previewScale === undefined && !isDetail && (
        <div className="local-status-bar-surface" aria-hidden="true" />
      )}
      {isDetail ? (
        <button
          className="local-round local-detail-back"
          onClick={closePlace}
          aria-label={t("Back to places", "목록으로 돌아가기")}
        >
          <LocalIcon name="chevron-left" />
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
        <MapScreen {...controller} viewportScale={previewScale ?? 1} />
      ) : (
        <DiscoverScreen {...controller} />
      )}
      {isDetail ? (
        <div className="local-detail-safe-area" aria-hidden="true" />
      ) : (
        <DiscoveryNavigation {...controller} />
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
