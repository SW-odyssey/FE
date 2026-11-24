"use client";

import type { CourseStop } from "../discovery/course";
import { localText, placeCount } from "../discovery/localization";
import type { DiscoveryLanguage, LocalPlace } from "../discovery/model";
import { layoutMapCaptions } from "./clusters";
import {
  groupMapMarkers,
  inMapScope,
  mapCaptionLimit,
  type MapPlaceGroup,
} from "./geometry";
import type { usePreviewMap } from "./usePreviewMap";

type PreviewMap = Omit<ReturnType<typeof usePreviewMap>, "attachFrame">;

/** Draw the local street map and its interactive overlays in the same CSS pixels. */
export function MapDiagram({
  attachFrame,
  map,
  stops,
  places,
  numbered,
  language,
  selectedId,
  scope,
  onGroupSelect,
  onSelect,
}: {
  attachFrame: (node: HTMLDivElement | null) => void;
  map: PreviewMap;
  stops: readonly CourseStop[];
  places: LocalPlace[];
  numbered: boolean;
  language: DiscoveryLanguage;
  selectedId?: string;
  scope?: string | null;
  onGroupSelect?: (group: MapPlaceGroup) => void;
  onSelect: (stop: CourseStop) => void;
}) {
  const level =
    map.scale < 0.48
      ? 6
      : map.scale < 0.8
        ? 5
        : map.scale < 1.18
          ? 4
          : map.scale < 1.6
            ? 3
            : 2;
  const bounds = {
    left: 12,
    right: map.width - 12,
    top: map.visibleTop,
    bottom: map.visibleBottom - 6,
  };
  const fits = ({ x, y }: { x: number; y: number }) =>
    x >= bounds.left &&
    x <= bounds.right &&
    y >= bounds.top &&
    y <= bounds.bottom;
  const points = stops.map(({ id }, index) => ({
    id,
    ...map.screenPoints[index],
  }));
  const visiblePoints = points.filter(fits);
  const markers = numbered
    ? []
    : groupMapMarkers(places, map.screenPointFor, level, selectedId);
  const groups = markers
    .filter(({ kind }) => kind !== "place")
    .map((group) => ({ id: group.id, group, ...map.screenPointFor(group) }))
    .filter(fits);
  const singletons = new Set(
    markers
      .filter(({ kind }) => kind === "place")
      .map(({ places }) => places[0].id),
  );
  const pinPoints = visiblePoints.filter(({ id }) => singletons.has(id));
  const pinIds = new Set(pinPoints.map(({ id }) => id));
  const names = new Map(
    stops.map(({ id, name, koreanName }) => [
      id,
      language === "ko" ? koreanName : name,
    ]),
  );
  const captions = numbered
    ? null
    : layoutMapCaptions(
        pinPoints
          .filter(({ id }) => level <= 4 || id === selectedId)
          .map((point) => ({
            ...point,
            width: Math.max(
              72,
              (names.get(point.id)?.length ?? 0) *
                (language === "en" ? 7 : 11) +
                16,
            ),
            height: 24,
          })),
        {
          ...bounds,
          right: Math.max(bounds.left, map.width - 72),
          selectedId,
          obstacles: [...pinPoints, ...groups],
          maxLabels: mapCaptionLimit(level, map.width),
        },
      );

  return (
    <div
      className={`local-map-diagram ${map.moving ? "is-panning" : ""}`}
      ref={attachFrame}
      {...map.events}
    >
      {/* Keep coordinates in CSS pixels while the viewport is resized. */}
      <svg aria-hidden="true">
        <g className="local-diagram-projection" transform={map.projection}>
          <image
            href="/assets/local/map/local-streets.svg"
            width={1800}
            height={3050}
          />
          {numbered && map.worldPoints.length > 1 && (
            <polyline
              points={map.worldPoints.map(({ x, y }) => `${x},${y}`).join(" ")}
            />
          )}
        </g>
      </svg>
      {groups.map(({ group, x, y }) => {
        const active = Boolean(
          scope && group.places.some((place) => inMapScope(place, scope)),
        );
        const select = group.kind === "cell";
        const label = select
          ? localText(language, "Choose a cell", "구역 선택")
          : localText(language, "Zoom in", "확대");
        return (
          <button
            key={group.id}
            type="button"
            className={`local-map-pin is-cluster${active ? " is-selected" : ""}`}
            data-map-kind={group.kind}
            style={{ left: x, top: y }}
            aria-label={`${label} ${placeCount(language, group.places.length)}`}
            aria-pressed={active}
            onClick={() =>
              select ? onGroupSelect?.(group) : map.zoomInto({ x, y })
            }
          >
            <span className="local-cluster-count">{group.places.length}</span>
          </button>
        );
      })}
      {stops.map((stop, index) => {
        if (numbered ? !fits(points[index]) : !pinIds.has(stop.id)) return null;
        const selected = stop.id === selectedId;
        const label = names.get(stop.id);
        const point = points[index];
        const caption = captions?.get(stop.id);
        const number = stop.position ?? index + 1;
        return (
          <button
            key={stop.id}
            type="button"
            className={
              numbered
                ? "local-course-map-pin"
                : `local-map-pin is-anchored-place ${selected ? "is-selected" : ""}`
            }
            style={{ left: point.x, top: point.y }}
            aria-label={numbered ? `${number}. ${label}` : label}
            aria-current={selected ? "true" : undefined}
            title={label}
            onClick={() => onSelect(stop)}
          >
            {numbered ? number : <span className="local-location-dot" />}
            {caption && (
              <span
                className={`local-map-caption is-${caption.side === "top" ? "above" : "below"}`}
                style={{ width: caption.maxWidth }}
                aria-hidden="true"
              >
                {label}
              </span>
            )}
            {numbered && selected && (
              <strong className="local-diagram-pin-label">{label}</strong>
            )}
          </button>
        );
      })}
      <a
        className="local-map-attribution"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap contributors
      </a>
    </div>
  );
}
