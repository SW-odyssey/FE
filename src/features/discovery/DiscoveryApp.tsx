"use client";

import { useState, useSyncExternalStore } from "react";
import { LocalIcon } from "../../components/ui/LocalIcon";
import { useDeviceLocation } from "../map/useDeviceLocation";
import { CourseScreen } from "./components/CourseScreen";
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

const desktopQuery = "(min-width: 960px)";
function subscribeToDesktop(notify: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => false;

export default function DiscoveryApp({
  source,
  previewScale,
}: {
  source?: DiscoveryDataSource;
  previewScale?: number;
}) {
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const wide = useSyncExternalStore(
    subscribeToDesktop,
    desktopSnapshot,
    serverSnapshot,
  );
  const desktop = previewScale === undefined && wide;
  const controller = useDiscoveryController(source, currentLocation, desktop);
  const courseLocation = useDeviceLocation(setCurrentLocation);
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
  const mapShowsCourse =
    view === "course" || (view === "map" && controller.courseMap);
  const isCourse =
    !isDetail && (view === "course" || (desktop && mapShowsCourse));
  const mapVisible = desktop || isMap;
  const navigation = useCompactNavigation(view);

  const sidebar =
    !isDetail && (desktop || !isMap) ? (
      <>
        {!isCourse && <SearchHeader {...controller} />}
        {isCourse ? (
          <CourseScreen
            {...controller}
            location={courseLocation}
            desktop={desktop}
          />
        ) : (
          <DiscoverScreen
            {...controller}
            visible={
              desktop && controller.mapScope
                ? controller.mapPlaces
                : controller.visible
            }
            mapScopeActive={desktop && Boolean(controller.mapScope)}
          />
        )}
      </>
    ) : null;

  return (
    <main
      ref={shell}
      onScrollCapture={navigation.onScroll}
      // The device frame (/guide) uses the same web layout as the real app.
      className={`local-shell local-refined local-web ${previewScale === undefined ? "local-responsive-web" : ""} ${desktop ? "is-desktop-map-layout" : ""} ${isMap && !desktop ? "is-map-mode" : ""}`}
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
      {desktop && !isDetail && (
        <DiscoveryNavigation {...controller} desktop compact={false} />
      )}
      {isDetail ? (
        <button
          className="local-round local-detail-back"
          onClick={closePlace}
          aria-label={
            view === "map" && !desktop
              ? t("Back to map", "지도로 돌아가기")
              : mapShowsCourse
                ? t("Back to course", "코스로 돌아가기")
                : t("Back to places", "목록으로 돌아가기")
          }
        >
          <LocalIcon name="chevron-left" size={36} />
        </button>
      ) : null}
      {selected ? (
        <PlaceDetail {...controller} selected={selected} key={selected.id} />
      ) : isDetail ? (
        <div className="local-content local-detail" ref={scroll}>
          <ResourceNotice status={detailStatus} retry={retry} t={t} missing />
        </div>
      ) : null}
      {desktop && sidebar ? (
        <div
          className="local-desktop-sidebar-content"
          key={isCourse ? "course" : "places"}
        >
          {sidebar}
        </div>
      ) : (
        sidebar
      )}
      {mapVisible && (
        <MapScreen
          {...controller}
          visible={controller.mapVisible}
          desktop={desktop}
          showCourse={mapShowsCourse}
          currentLocation={currentLocation}
          onLocate={setCurrentLocation}
          viewportScale={previewScale ?? 1}
        />
      )}
      {isDetail ? (
        <div className="local-detail-safe-area" aria-hidden="true" />
      ) : !desktop ? (
        <DiscoveryNavigation
          {...controller}
          desktop={desktop}
          compact={!desktop && navigation.compact}
        />
      ) : null}
      {modal && (
        <DiscoveryOverlay
          {...controller}
          selectPreviewLocation={() => {
            controller.selectPreviewLocation();
            if (mapShowsCourse) courseLocation.locate();
          }}
        />
      )}
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
