import type { Coordinate } from "../../discovery/model.ts";
import { localText, placeCount } from "../../discovery/localization.ts";
import { layoutMapCaptions, mapFocusCentrePoint } from "../clusters.ts";
import {
  restorableMapCamera,
  type ExploreMapOptions,
  type ExploreMapSession,
} from "../controller.ts";
import { groupMapMarkers, inMapScope, mapCaptionLimit } from "../geometry.ts";

const levelOffset = 21;
const minZoom = 11;
const maxZoom = 20;
const initialCenter = { lat: 37.574, lng: 126.9897 };

type Pin = {
  button: HTMLButtonElement;
  symbol: HTMLSpanElement;
  caption: HTMLSpanElement;
  point: Coordinate;
};

function mapOptions(): google.maps.MapOptions {
  return {
    disableDefaultUI: true,
    clickableIcons: false,
    minZoom,
    maxZoom,
    gestureHandling: "greedy",
    styles: [
      { featureType: "poi", stylers: [{ visibility: "off" }] },
      {
        featureType: "transit",
        elementType: "labels.icon",
        stylers: [{ visibility: "off" }],
      },
    ],
  };
}

function createPinLayer(map: google.maps.Map, element: HTMLDivElement) {
  const overlay = new google.maps.OverlayView();
  const pins = new Map<string, Pin>();
  const root = element.ownerDocument.createElement("div");
  root.className = "local-google-pins";
  function draw() {
    const projection = overlay.getProjection();
    if (!projection) return;
    for (const { button, point } of pins.values()) {
      const pixel = projection.fromLatLngToDivPixel(point);
      if (!pixel) continue;
      button.style.left = `${pixel.x}px`;
      button.style.top = `${pixel.y}px`;
    }
  }
  overlay.onAdd = () => overlay.getPanes()?.overlayMouseTarget.append(root);
  overlay.draw = draw;
  overlay.onRemove = () => root.remove();
  overlay.setMap(map);

  function upsert(
    id: string,
    point: Coordinate,
    className: string,
    label: string,
  ) {
    let pin = pins.get(id);
    if (!pin) {
      const button = element.ownerDocument.createElement("button");
      const symbol = element.ownerDocument.createElement("span");
      const caption = element.ownerDocument.createElement("span");
      caption.setAttribute("aria-hidden", "true");
      caption.hidden = true;
      button.type = "button";
      button.append(symbol, caption);
      google.maps.OverlayView.preventMapHitsFrom(button);
      pin = { button, symbol, caption, point };
      pins.set(id, pin);
      root.append(button);
    }
    pin.point = point;
    pin.button.className = className;
    pin.button.setAttribute("aria-label", label);
    return pin;
  }

  function keep(ids: Set<string>) {
    for (const [id, pin] of pins) {
      if (ids.has(id)) continue;
      pin.button.remove();
      pins.delete(id);
    }
    draw();
  }
  return {
    upsert,
    keep,
    overlay,
    dispose: () => {
      overlay.setMap(null);
      pins.clear();
    },
  };
}

/** Display the LOCAL itinerary and place overlays on a live Google map. */
export function createGoogleExploreMapSession(
  element: HTMLDivElement,
  read: () => ExploreMapOptions,
  onZoom: (level: number) => void,
): ExploreMapSession {
  const collection = () => {
    const { courseStops, places } = read();
    return `google:${courseStops ? "course:" : ""}${(courseStops ?? places).map(({ id }) => id).join(",")}`;
  };
  const cached = restorableMapCamera(read().memory?.current, collection());
  let restoreFit = Boolean(cached);
  const map = new google.maps.Map(element, {
    ...mapOptions(),
    center: cached ?? read().searchOrigin ?? initialCenter,
    zoom: cached ? levelOffset - cached.level : 16,
  });
  const pins = createPinLayer(map, element);
  const plum =
    getComputedStyle(element).getPropertyValue("--local-plum").trim() ||
    "#4a1db0";
  const line = new google.maps.Polyline({
    map,
    clickable: false,
    strokeOpacity: 0,
    icons: [
      {
        icon: {
          path: "M 0,-1 0,1",
          strokeColor: plum,
          strokeOpacity: 1,
          strokeWeight: 3,
          scale: 2,
        },
        offset: "0",
        repeat: "9px",
      },
    ],
  });
  const location = new google.maps.Circle({
    map,
    radius: 9,
    clickable: false,
    visible: false,
    fillColor: "#347bff",
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
  });
  let course: ExploreMapOptions["courseStops"];
  let pendingFocus: Coordinate | null = null;
  let fitPending = false;
  let initialized = false;
  let fitCentre: Coordinate | null = null;
  let fittedArea = "";
  let autoFit = !cached && !read().searchOrigin;
  let shownZoom: number | undefined;

  function padding() {
    const { sheetInset, viewportInsets } = read();
    const height = element.clientHeight;
    const top = Math.min(
      (viewportInsets?.top ?? 72) + 12,
      Math.max(12, height - 80),
    );
    const bottom = Math.min(
      sheetInset + (viewportInsets?.bottom ?? 86) + 20,
      Math.max(0, height - top - 60),
    );
    return { top, right: 66, bottom, left: 40 };
  }

  function fitArea() {
    const { top, bottom } = padding();
    return `${element.clientWidth}:${element.clientHeight}:${top}:${bottom}`;
  }

  function centerOn(point: Coordinate) {
    const projection = pins.overlay.getProjection();
    const target = projection?.fromLatLngToContainerPixel(point);
    if (!target) {
      pendingFocus = point;
      return;
    }
    pendingFocus = null;
    const { top, bottom } = padding();
    const center = mapFocusCentrePoint(target, {
      canvasHeight: element.clientHeight,
      viewportScale: 1,
      sheetInset: 0,
      top,
      bottom,
    });
    const position = projection.fromContainerPixelToLatLng(
      new google.maps.Point(center.x, center.y),
    );
    if (
      !position ||
      Math.abs(element.clientHeight / 2 - center.y) +
        Math.abs(element.clientWidth / 2 - center.x) <
        2
    )
      return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      map.setCenter(position);
    else map.panTo(position);
  }

  function fit(points: readonly Coordinate[]) {
    if (!points.length) return;
    if (
      points.every(
        (point) => point.lat === points[0].lat && point.lng === points[0].lng,
      )
    ) {
      map.setZoom(Math.max(map.getZoom() ?? 0, 17));
      centerOn(points[0]);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const point of points) bounds.extend(point);
    fitCentre = bounds.getCenter().toJSON();
    map.fitBounds(bounds, padding());
  }

  function fitRecommendations(restore = false) {
    if (restore && restoreFit) {
      restoreFit = false;
      return;
    }
    if (!initialized || !element.clientWidth || !element.clientHeight) {
      fitPending = true;
      return;
    }
    fitPending = false;
    autoFit = true;
    fittedArea = fitArea();
    const { courseStops, places, scope } = read();
    fit(courseStops ?? places.filter((place) => inMapScope(place, scope)));
  }

  function render() {
    if (autoFit && fittedArea && fittedArea !== fitArea()) fitRecommendations();
    const { courseStops, places, selected, scope, language } = read();
    const zoom = map.getZoom() ?? 16;
    if (shownZoom !== zoom) {
      shownZoom = zoom;
      onZoom(levelOffset - zoom);
    }
    if (course !== courseStops) {
      course = courseStops;
      line.setPath(
        courseStops?.length
          ? courseStops.map(({ lat, lng }) => ({ lat, lng }))
          : [],
      );
    }
    const t = (en: string, ko: string) => localText(language, en, ko);
    const name = (place: { name: string; koreanName: string }) =>
      language === "ko" ? place.koreanName : place.name;
    const activeIds = new Set<string>();
    const projection = pins.overlay.getProjection();
    if (courseStops) {
      courseStops.forEach((stop, index) => {
        const id = `course:${stop.id}`;
        const number = stop.position ?? index + 1;
        const label = `${number}. ${name(stop)}`;
        const pin = pins.upsert(id, stop, "local-course-map-pin", label);
        pin.symbol.textContent = String(number);
        const active = selected?.id === stop.id;
        if (active) pin.button.setAttribute("aria-current", "true");
        else pin.button.removeAttribute("aria-current");
        pin.caption.className = "local-diagram-pin-label";
        pin.caption.textContent = name(stop);
        pin.caption.hidden = !active;
        pin.button.onclick = () => read().onCourseStopSelect?.(stop);
        activeIds.add(id);
      });
      pins.keep(activeIds);
      return;
    }
    if (!projection) return;
    const level = levelOffset - zoom;
    const project = (point: Coordinate) =>
      projection.fromLatLngToContainerPixel(point);
    const markers = groupMapMarkers(places, project, level, selected?.id);
    const selectedMarker = selected ? `place:${selected.id}` : null;
    const safe = padding();
    const points = markers.flatMap((group) => {
      const xy = project(group);
      return xy
        ? [
            {
              id: group.id,
              x: xy.x,
              y: xy.y,
              kind: group.kind,
              label: name(group.places[0]),
            },
          ]
        : [];
    });
    const captions = layoutMapCaptions(
      points
        .filter(
          ({ id, kind }) =>
            kind === "place" && (level <= 4 || id === selectedMarker),
        )
        .map((point) => ({
          ...point,
          width: Math.max(
            72,
            point.label.length * (language === "en" ? 7 : 11) + 18,
          ),
          height: 24,
        })),
      {
        left: 4,
        right: element.clientWidth - 60,
        top: safe.top,
        bottom: element.clientHeight - safe.bottom,
        selectedId: selectedMarker,
        obstacles: points,
        maxLabels: mapCaptionLimit(level, element.clientWidth),
      },
    );
    for (const group of markers) {
      const { kind } = group;
      const place = group.places[0];
      const count = group.places.length;
      const label =
        kind === "place"
          ? name(place)
          : `${kind === "cell" ? t("Choose a cell", "구역 선택") : t("Zoom in", "확대")} ${placeCount(language, count)}`;
      const active = group.places.some(
        (member) =>
          member.id === selected?.id || (scope && inMapScope(member, scope)),
      );
      const variant = kind === "place" ? "is-anchored-place" : "is-cluster";
      const pin = pins.upsert(
        group.id,
        group,
        `local-map-pin ${variant}${active ? " is-selected" : ""}`,
        label,
      );
      pin.symbol.className =
        kind === "place" ? "local-location-dot" : "local-cluster-count";
      pin.symbol.textContent = kind === "place" ? "" : String(count);
      pin.button.dataset.mapKind = kind;
      const caption = captions.get(group.id);
      pin.caption.className = `local-map-caption is-${caption?.side === "bottom" ? "below" : "above"}`;
      pin.caption.textContent = kind === "place" ? label : "";
      pin.caption.hidden = !caption;
      pin.caption.style.maxWidth = caption ? `${caption.maxWidth}px` : "";
      pin.button.onclick = () => {
        if (kind === "place") read().onSelect(place);
        else if (kind === "cell") read().onGroupSelect?.(group);
        else {
          autoFit = false;
          map.setZoom(Math.min(maxZoom, zoom + 1));
          centerOn(group);
        }
      };
      activeIds.add(group.id);
    }
    pins.keep(activeIds);
  }

  const onIdle = map.addListener("idle", () => {
    initialized = true;
    if (fitPending) {
      fitRecommendations();
      return;
    }
    if (pendingFocus || fitCentre) {
      const focus = pendingFocus ?? fitCentre;
      fitCentre = null;
      if (focus) centerOn(focus);
    }
    render();
    const center = map.getCenter();
    const { memory, selected } = read();
    if (memory && center)
      memory.current = {
        ...center.toJSON(),
        level: levelOffset - (map.getZoom() ?? 16),
        collection: collection(),
        selectedId: selected?.id ?? null,
      };
  });
  function markManual() {
    autoFit = false;
  }
  const dragStart = map.addListener("dragstart", markManual);
  const dragEnd = map.addListener("dragend", () => read().onViewportDrag?.());
  element.addEventListener("wheel", markManual, { passive: true });
  element.addEventListener("dblclick", markManual);
  const pinch = (event: TouchEvent) => {
    if (event.touches.length > 1) markManual();
  };
  element.addEventListener("touchstart", pinch, { passive: true });
  const resize = new ResizeObserver(() => {
    if (fitPending) fitRecommendations();
    render();
  });
  resize.observe(element);
  render();

  return {
    render,
    getCenter: () => map.getCenter()?.toJSON() ?? null,
    fitRecommendations,
    focusSelected: () => {
      const { selected, focusSelected } = read();
      if (!selected || !focusSelected) return;
      markManual();
      if (fitPending || fitCentre) pendingFocus = selected;
      else centerOn(selected);
    },
    zoomBy: (delta) => {
      markManual();
      map.setZoom(
        Math.max(minZoom, Math.min(maxZoom, (map.getZoom() ?? 16) - delta)),
      );
    },
    setCurrentLocation: (point) => {
      location.setCenter(point);
      location.setVisible(true);
    },
    centerOn: (point) => {
      markManual();
      centerOn(point);
    },
    dispose: () => {
      resize.disconnect();
      onIdle.remove();
      dragStart.remove();
      dragEnd.remove();
      element.removeEventListener("wheel", markManual);
      element.removeEventListener("dblclick", markManual);
      element.removeEventListener("touchstart", pinch);
      location.setMap(null);
      line.setMap(null);
      pins.dispose();
      google.maps.event.clearInstanceListeners(map);
      element.replaceChildren();
    },
  };
}

/** Show a non-interactive Google map in the place preview. */
export function createGoogleMiniMapSession(
  element: HTMLDivElement,
  point: Coordinate,
) {
  const map = new google.maps.Map(element, {
    ...mapOptions(),
    center: point,
    zoom: 17,
    gestureHandling: "none",
    keyboardShortcuts: false,
    disableDoubleClickZoom: true,
  });
  const pin = new google.maps.OverlayView();
  const dot = element.ownerDocument.createElement("span");
  dot.className = "local-mini-map-marker";
  pin.onAdd = () => pin.getPanes()?.overlayLayer.append(dot);
  pin.draw = () => {
    const pixel = pin.getProjection()?.fromLatLngToDivPixel(point);
    if (!pixel) return;
    dot.style.left = `${pixel.x}px`;
    dot.style.top = `${pixel.y}px`;
  };
  pin.onRemove = () => dot.remove();
  pin.setMap(map);
  return {
    dispose: () => {
      pin.setMap(null);
      google.maps.event.clearInstanceListeners(map);
      element.replaceChildren();
    },
  };
}
