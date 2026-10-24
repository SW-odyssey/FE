import type { Coordinate, LocalPlace } from "../../discovery/model.ts";
import { mapFocusCentrePoint } from "../clusters.ts";
import {
  restorableMapCamera,
  type ExploreMapOptions,
  type ExploreMapSession,
} from "../controller.ts";
import { createMapCells } from "./cells.ts";
import { loadKakaoSdk } from "./load-sdk.ts";
import { createMapOverlays } from "./overlays.ts";

/** Prepare the preview's SDK; callers own cancellation and visible failure state.
 * @returns Shared SDK load promise, rejected when the preview key is unavailable
 */
export function prepareKakaoMap(): Promise<void> {
  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
  return key
    ? loadKakaoSdk(key)
    : Promise.reject(new Error("Map key unavailable"));
}
const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Create the provider adapter while keeping SDK objects inside this directory.
 * @param element Existing map canvas owned by the React view
 * @param readOptions Latest view state and callbacks
 * @param onZoom Publishes SDK level changes for the view's controls
 * @returns Controls and idempotent resource cleanup for this map instance
 */
export function createExploreMapSession(
  element: HTMLDivElement,
  readOptions: () => ExploreMapOptions,
  onZoom: (level: number) => void,
): ExploreMapSession {
  const initial = readOptions();
  const collection = () =>
    readOptions()
      .places.map((place) => place.id)
      .join(",");
  const cached = restorableMapCamera(initial.memory?.current, collection());
  let restoreFit = Boolean(cached);
  let restoreFocus = cached?.selectedId;
  let disposed = false;
  let frame = 0;
  const map = new kakao.maps.Map(element, {
    center: new kakao.maps.LatLng(
      cached?.lat ?? 37.574,
      cached?.lng ?? 126.9897,
    ),
    level: cached?.level ?? 5,
    draggable: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
  });
  map.setDraggable(true);
  map.setZoomable(true);
  map.setMinLevel(1);
  map.setMaxLevel(10);
  const overlays = createMapOverlays(map, element);
  const cells = createMapCells(map);
  function remember() {
    const options = readOptions();
    if (!options.memory) return;
    const center = map.getCenter();
    options.memory.current = {
      lat: center.getLat(),
      lng: center.getLng(),
      level: map.getLevel(),
      collection: collection(),
      selectedId: options.selected?.id ?? null,
    };
  }
  const zoomChanged = () => onZoom(map.getLevel());
  const idle = () => {
    remember();
    overlays.render(readOptions());
  };
  kakao.maps.event.addListener(map, "zoom_changed", zoomChanged);
  kakao.maps.event.addListener(map, "idle", idle);
  const observer = new ResizeObserver(() => map.relayout());
  observer.observe(element);
  onZoom(map.getLevel());

  function fitRecommendations(restore = false) {
    if (restore && restoreFit) {
      restoreFit = false;
      return;
    }
    const { places, viewportScale, sheetInset } = readOptions();
    if (!places.length) return;
    const bounds = new kakao.maps.LatLngBounds();
    for (const place of places)
      bounds.extend(new kakao.maps.LatLng(place.lat, place.lng));
    map.setBounds(
      bounds,
      252 * viewportScale,
      92 * viewportScale,
      (Math.min(sheetInset, 292) + 98 + 64) * viewportScale,
      52 * viewportScale,
    );
  }
  function focusSelected() {
    const { selected, focusSelected, viewportScale, sheetInset } =
      readOptions();
    if (!selected || !focusSelected) return;
    if (restoreFocus === selected.id) {
      restoreFocus = undefined;
      return;
    }
    const projection = map.getProjection();
    const target = projection.containerPointFromCoords(
      new kakao.maps.LatLng(selected.lat, selected.lng),
    );
    const centre = mapFocusCentrePoint(target, {
      canvasHeight: element.clientHeight,
      viewportScale,
      sheetInset,
    });
    const point = projection.coordsFromContainerPoint(
      new kakao.maps.Point(centre.x, centre.y),
    );
    if (reduceMotion()) map.setCenter(point);
    else map.panTo(point);
  }
  return {
    render() {
      cancelAnimationFrame(frame);
      overlays.render(readOptions());
      cells.render(readOptions());
      frame = requestAnimationFrame(() => overlays.render(readOptions()));
    },
    fitRecommendations,
    focusSelected,
    zoomBy(delta) {
      map.setLevel(Math.max(1, Math.min(10, map.getLevel() + delta)), {
        animate: reduceMotion() ? false : { duration: 180 },
      });
    },
    centerOn(point: Coordinate) {
      map.panTo(new kakao.maps.LatLng(point.lat, point.lng));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      remember();
      observer.disconnect();
      kakao.maps.event.removeListener(map, "zoom_changed", zoomChanged);
      kakao.maps.event.removeListener(map, "idle", idle);
      overlays.dispose();
      cells.dispose();
    },
  };
}

/** Create the non-interactive detail thumbnail, retaining its existing marker DOM.
 * @param element Existing thumbnail canvas
 * @param place Place whose coordinate centres the thumbnail
 * @returns Marker cleanup for the thumbnail session
 */
export function createMiniMapSession(
  element: HTMLDivElement,
  place: LocalPlace,
) {
  const position = new kakao.maps.LatLng(place.lat, place.lng);
  const map = new kakao.maps.Map(element, {
    center: position,
    level: 5,
    draggable: false,
    scrollwheel: false,
  });
  const dot = document.createElement("span");
  dot.className = "local-mini-map-marker";
  const overlay = new kakao.maps.CustomOverlay({ map, position, content: dot });
  return { dispose: () => overlay.setMap(null) };
}
