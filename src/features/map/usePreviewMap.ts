"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { CourseStop } from "../discovery/course";
import type { Coordinate } from "../discovery/model";

type Point = { x: number; y: number };
type Camera = { center: Point; scale: number };
type ManualView = Camera & { collection: string };

const zoomStep = 1.4;
const maxScale = 8;

// Match the projected units in local-streets.svg.
function project({ lat, lng }: Coordinate): Point {
  return { x: (lng - 126.975) * 79000, y: (37.59 - lat) * 100000 };
}

const defaultCenter = project({ lat: 37.5737, lng: 126.9875 });

/** Keep the roads, route, and pin hit targets on one pixel-based camera. */
export function usePreviewMap({
  enabled,
  stops,
  numbered,
  top,
  bottom,
  viewportScale,
  focus,
  focusRequest,
}: {
  enabled: boolean;
  stops: readonly CourseStop[];
  numbered: boolean;
  top: number;
  bottom: number;
  viewportScale: number;
  focus: Coordinate | null;
  focusRequest?: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const attachFrame = useCallback((element: HTMLDivElement | null) => {
    frame.current = element;
  }, []);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const [moving, setMoving] = useState(false);
  const [{ width, height }, setSize] = useState({ width: 560, height: 500 });
  const layer = numbered ? "course" : "places";
  const [manualViews, setManualViews] = useState<
    Partial<Record<typeof layer, ManualView>>
  >({});
  const manual = manualViews[layer];

  const points = stops.map(project);
  const collection = stops
    .map(({ id, lat, lng }) => `${id}:${lat}:${lng}`)
    .join(",");
  const bounds = points.length ? points : [defaultCenter];
  const west = Math.min(...bounds.map(({ x }) => x));
  const east = Math.max(...bounds.map(({ x }) => x));
  const north = Math.min(...bounds.map(({ y }) => y));
  const south = Math.max(...bounds.map(({ y }) => y));
  const visibleBottom = Math.max(48, height - bottom);
  const visibleTop = Math.min(top, visibleBottom - 48);
  const visibleHeight = visibleBottom - visibleTop;
  const padding = Math.min(72, Math.max(32, visibleHeight * 0.3));
  const fitHeight = Math.max(32, visibleHeight - padding);
  // Tight routes still need enough separation for each numbered pin on short screens.
  const minimumSpanY = numbered ? Math.min(130, fitHeight / 1.65) : 350;
  const origin = { x: width / 2, y: (visibleTop + visibleBottom) / 2 };
  const fit: Camera = {
    center: { x: (west + east) / 2, y: (north + south) / 2 },
    scale: Math.min(
      Math.max(80, width - 116) / Math.max(numbered ? 160 : 450, east - west),
      fitHeight / Math.max(minimumSpanY, south - north),
      numbered ? 4.5 : 2,
    ),
  };
  const camera = manual?.collection === collection ? manual : fit;
  const focusKey =
    enabled && focus
      ? `${layer}|${collection}|${focus.lat},${focus.lng}|${focusRequest}`
      : null;
  const [lastFocus, setLastFocus] = useState<string | null>(null);
  if (focusKey !== lastFocus) {
    setLastFocus(focusKey);
    if (focusKey && focus) {
      setManualViews({
        ...manualViews,
        [layer]: { collection, center: project(focus), scale: camera.scale },
      });
    }
  }
  const minScale = Math.min(fit.scale, 0.35, camera.scale);
  const offset = {
    x: origin.x - camera.center.x * camera.scale,
    y: origin.y - camera.center.y * camera.scale,
  };
  function screenPoint({ x, y }: Point): Point {
    return {
      x: offset.x + x * camera.scale,
      y: offset.y + y * camera.scale,
    };
  }

  function changeCamera(change: (current: Camera) => Camera) {
    setManualViews((views) => {
      const previous = views[layer];
      return {
        ...views,
        [layer]: {
          ...change(previous?.collection === collection ? previous : fit),
          collection,
        },
      };
    });
  }

  function zoomAt(factor: number, anchor = origin) {
    changeCamera(({ center, scale }) => {
      const next = Math.max(minScale, Math.min(maxScale, scale * factor));
      const shift = 1 / scale - 1 / next;
      return {
        center: {
          x: center.x + (anchor.x - origin.x) * shift,
          y: center.y + (anchor.y - origin.y) * shift,
        },
        scale: next,
      };
    });
  }

  // A native listener can cancel scroll on the map while leaving the sidebar scrollable.
  const onWheel = useRef<(event: WheelEvent) => void>(() => {});
  useLayoutEffect(() => {
    onWheel.current = (event) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        Math.abs(event.deltaY) <= Math.abs(event.deltaX)
      )
        return;
      event.preventDefault();
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
      const pixels = Math.max(-240, Math.min(240, event.deltaY * unit));
      zoomAt(Math.exp(-pixels / 300), pointFromClient(event));
    };
  });

  useLayoutEffect(() => {
    const node = frame.current;
    if (!enabled || !node) return;
    const measure = () => {
      const { clientWidth, clientHeight } = node;
      if (clientWidth && clientHeight)
        setSize((size) =>
          size.width === clientWidth && size.height === clientHeight
            ? size
            : { width: clientWidth, height: clientHeight },
        );
    };
    const wheel = (event: WheelEvent) => onWheel.current(event);
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    node.addEventListener("wheel", wheel, { passive: false });
    measure();
    return () => {
      observer.disconnect();
      node.removeEventListener("wheel", wheel);
      drag.current = null;
    };
  }, [enabled]);

  function pointFromClient({
    clientX,
    clientY,
  }: {
    clientX: number;
    clientY: number;
  }) {
    const box = frame.current?.getBoundingClientRect();
    return box
      ? {
          x: (clientX - box.left) / viewportScale,
          y: (clientY - box.top) / viewportScale,
        }
      : origin;
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      (event.target as Element).closest("a")
    )
      return;
    drag.current = {
      id: event.pointerId,
      ...pointFromClient(event),
      moved: false,
    };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (active?.id !== event.pointerId) return;
    const point = pointFromClient(event);
    const dx = point.x - active.x;
    const dy = point.y - active.y;
    if (!active.moved) {
      if (Math.hypot(dx, dy) < 4) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setMoving(true);
    }
    Object.assign(active, point, { moved: true });
    changeCamera(({ center, scale }) => ({
      center: { x: center.x - dx / scale, y: center.y - dy / scale },
      scale,
    }));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setMoving(false);
  }

  return {
    attachFrame,
    width,
    height,
    moving,
    scale: camera.scale,
    visibleTop,
    visibleBottom,
    worldPoints: points,
    screenPoints: points.map(screenPoint),
    worldPoint: project,
    screenPointFor: (point: Coordinate) => screenPoint(project(point)),
    projection: `translate(${offset.x} ${offset.y}) scale(${camera.scale})`,
    canZoomIn: camera.scale < maxScale,
    canZoomOut: camera.scale > minScale,
    zoomBy: (direction: -1 | 1) => zoomAt(zoomStep ** -direction),
    zoomInto: (point: Point) => {
      changeCamera(({ center, scale }) => ({
        center: {
          x: center.x + (point.x - origin.x) / scale,
          y: center.y + (point.y - origin.y) / scale,
        },
        scale: Math.min(maxScale, scale * zoomStep ** 2),
      }));
    },
    fit: () => setManualViews((views) => ({ ...views, [layer]: undefined })),
    events: {
      onPointerDown: startDrag,
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
      onPointerLeave: (event: PointerEvent<HTMLDivElement>) => {
        if (!drag.current?.moved) endDrag(event);
      },
      onDoubleClick: (event: MouseEvent<HTMLDivElement>) => {
        if (!(event.target as Element).closest("button, a"))
          zoomAt(zoomStep, pointFromClient(event));
      },
    },
  };
}
