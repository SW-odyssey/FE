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
export default function DiscoveryPreview({
  source,
}: {
  source?: DiscoveryDataSource;
} = {}) {
  const controller = useDiscoveryController(source);
  const {
    stage,
    phoneScale,
    viewportReady,
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
  return (
    <div className="local-preview-stage" ref={stage}>
      <div
        className="local-phone-frame"
        style={{
          width: 413 * phoneScale,
          height: 872 * phoneScale,
          visibility: viewportReady ? "visible" : "hidden",
        }}
      >
        <main
          ref={shell}
          className={`local-shell local-refined ${view === "map" && !isDetail ? "is-map-mode" : ""}`}
          style={{
            transform: `scale(${phoneScale})`,
            left: 10 * phoneScale,
            top: 10 * phoneScale,
          }}
        >
          <div className="local-system-bar" aria-hidden="true">
            <img
              src="/assets/ios-status-bar.svg"
              alt=""
              width="402"
              height="62"
            />
          </div>
          {!isDetail && <SearchHeader {...controller} />}
          {isDetail && (
            <button
              className="local-round local-detail-back"
              onClick={closePlace}
              aria-label={t("Back to places", "목록으로 돌아가기")}
            >
              <LocalIcon name="chevron-left" />
            </button>
          )}
          {selected ? (
            <PlaceDetail
              {...controller}
              selected={selected}
              key={selected.id}
            />
          ) : isDetail ? (
            <div className="local-content local-detail" ref={scroll}>
              <ResourceNotice
                status={detailStatus}
                retry={retry}
                t={t}
                missing
              />
            </div>
          ) : view === "discover" ? (
            <DiscoverScreen {...controller} />
          ) : (
            <MapScreen {...controller} />
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
          <div className="local-device-home" aria-hidden="true" />
        </main>
      </div>
    </div>
  );
}
