import type { Coordinate, LocalPlace } from "../../discovery/model.ts";
import { mapFocusCentrePoint } from "../clusters.ts";
import {
  previewMapInsets,
  restorableMapCamera,
  type ExploreMapOptions,
  type ExploreMapSession,
} from "../controller.ts";
import { inMapScope } from "../geometry.ts";
import { loadKakaoSdk } from "./load-sdk.ts";
import { createMapOverlays } from "./overlays.ts";
import type { CourseStop } from "../../discovery/course.ts";

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
  const collection = () => {
    const { courseStops, places } = readOptions();
    return (
      (courseStops ? "course:" : "") +
      (courseStops ?? places).map((place) => place.id).join(",")
    );
  };
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
  const course = createCourseOverlays(map, element, readOptions);
  function placeOptions() {
    const options = readOptions();
    return options.courseStops
      ? { ...options, places: [], selected: null }
      : options;
  }
  let locationOverlay: kakao.maps.CustomOverlay | undefined;
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
    overlays.render(placeOptions());
  };
  kakao.maps.event.addListener(map, "zoom_changed", zoomChanged);
  kakao.maps.event.addListener(map, "idle", idle);
  const observer = new ResizeObserver(() => {
    if (!element.clientWidth || !element.clientHeight) return;
    const center = map.getCenter();
    map.relayout();
    map.setCenter(center);
    overlays.render(placeOptions());
  });
  observer.observe(element);
  onZoom(map.getLevel());

  function fitRecommendations(restore = false) {
    if (restore && restoreFit) {
      restoreFit = false;
      return;
    }
    const {
      places,
      courseStops,
      scope,
      viewportScale,
      sheetInset,
      viewportInsets = previewMapInsets,
    } = readOptions();
    const targets =
      courseStops ?? places.filter((place) => inMapScope(place, scope));
    if (!targets.length) return;
    const bounds = new kakao.maps.LatLngBounds();
    for (const place of targets)
      bounds.extend(new kakao.maps.LatLng(place.lat, place.lng));
    const top = viewportInsets.top + 12;
    const bottom = Math.min(
      Math.min(sheetInset, 292) + viewportInsets.bottom + 76,
      Math.max(0, element.clientHeight / viewportScale - top - 64),
    );
    if (
      courseStops &&
      targets.every(
        (place) => place.lat === targets[0].lat && place.lng === targets[0].lng,
      )
    ) {
      map.setLevel(3);
      centerOn(targets[0]);
      return;
    }
    map.setBounds(
      bounds,
      top * viewportScale,
      92 * viewportScale,
      bottom * viewportScale,
      52 * viewportScale,
    );
  }
  function focusSelected() {
    const { selected, focusSelected } = readOptions();
    if (!selected || !focusSelected) return;
    if (restoreFocus === selected.id) {
      restoreFocus = undefined;
      return;
    }
    centerOn(selected);
  }
  function centerOn({ lat, lng }: Coordinate) {
    const { viewportScale, sheetInset, viewportInsets } = readOptions();
    const projection = map.getProjection();
    const target = projection.containerPointFromCoords(
      new kakao.maps.LatLng(lat, lng),
    );
    const centre = mapFocusCentrePoint(target, {
      canvasHeight: element.clientHeight,
      viewportScale,
      sheetInset,
      top: viewportInsets?.top,
      bottom: viewportInsets?.bottom,
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
      overlays.render(placeOptions());
      course.render();
      frame = requestAnimationFrame(() => overlays.render(placeOptions()));
    },
    fitRecommendations,
    focusSelected,
    zoomBy(delta) {
      map.setLevel(Math.max(1, Math.min(10, map.getLevel() + delta)), {
        animate: reduceMotion() ? false : { duration: 180 },
      });
    },
    centerOn,
    setCurrentLocation({ lat, lng }) {
      const position = new kakao.maps.LatLng(lat, lng);
      if (locationOverlay) {
        locationOverlay.setPosition(position);
        return;
      }
      const dot = element.ownerDocument.createElement("span");
      dot.className = "local-map-location-dot";
      dot.setAttribute("aria-hidden", "true");
      locationOverlay = new kakao.maps.CustomOverlay({
        map,
        position,
        content: dot,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 20,
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      remember();
      observer.disconnect();
      kakao.maps.event.removeListener(map, "zoom_changed", zoomChanged);
      kakao.maps.event.removeListener(map, "idle", idle);
      locationOverlay?.setMap(null);
      overlays.dispose();
      course.dispose();
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

/** Display an ordered course on the current map without recreating its camera. */
function createCourseOverlays(
  map: kakao.maps.Map,
  element: HTMLDivElement,
  read: () => ExploreMapOptions,
) {
  let displayed: readonly CourseStop[] | undefined;
  let pins: { button: HTMLButtonElement; overlay: kakao.maps.CustomOverlay }[] =
    [];
  let line: kakao.maps.Polyline | undefined;
  function dispose() {
    line?.setMap(null);
    line = undefined;
    pins.forEach(({ overlay }) => overlay.setMap(null));
    pins = [];
  }
  return {
    render() {
      const { courseStops, language, selected } = read();
      if (displayed !== courseStops) {
        dispose();
        displayed = courseStops;
        if (!courseStops?.length) return;
        const path = courseStops.map(
          ({ lat, lng }) => new kakao.maps.LatLng(lat, lng),
        );
        if (path.length > 1) {
          line = new kakao.maps.Polyline({
            map,
            path,
            strokeColor: getComputedStyle(element)
              .getPropertyValue("--local-plum")
              .trim(),
            strokeWeight: 3,
            strokeStyle: "shortdash",
          });
        }
        pins = path.map((position, index) => {
          const button = element.ownerDocument.createElement("button");
          button.type = "button";
          button.className = "local-course-map-pin";
          button.textContent = String(courseStops[index].position ?? index + 1);
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            read().onCourseStopSelect?.(courseStops[index]);
          });
          const overlay = new kakao.maps.CustomOverlay({
            map,
            position,
            content: button,
            xAnchor: 0.5,
            yAnchor: 0.5,
            zIndex: 15,
          });
          return { button, overlay };
        });
      }
      pins.forEach(({ button }, index) => {
        const stop = courseStops![index];
        button.setAttribute(
          "aria-label",
          `${stop.position ?? index + 1}. ${language === "ko" ? stop.koreanName : stop.name}`,
        );
        if (selected?.id === stop.id)
          button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
      });
    },
    dispose,
  };
}
