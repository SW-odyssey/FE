"use client";

import type { CourseStop } from "../discovery/course";
import { localText, placeCount } from "../discovery/localization";
import type { DiscoveryLanguage, LocalPlace } from "../discovery/model";
import { clusterScreenPlaces, layoutMapCaptions } from "./clusters";
import { groupedMarkerCells, type MapPlaceGroup } from "./geometry";
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
  const mode =
    map.scale < 0.48 ? "overview" : map.scale < 1.18 ? "cells" : "places";
  const cells =
    !numbered && mode === "cells" ? groupedMarkerCells(places, selectedId) : [];
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
  const clusters =
    !numbered && mode === "overview"
      ? clusterScreenPlaces(visiblePoints, { radius: 52, selectedId }).filter(
          ({ count }) => count > 1,
        )
      : [];
  const cellMarkers = cells
    .map((group) => ({ id: group.id, group, ...map.screenPointFor(group) }))
    .filter(fits);
  const grouped = new Set([
    ...clusters.flatMap(({ memberIds }) => memberIds),
    ...cellMarkers.flatMap(({ group }) => group.places.map(({ id }) => id)),
  ]);
  const pinPoints = visiblePoints.filter(({ id }) => !grouped.has(id));
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
        pinPoints.map((point) => ({
          ...point,
          width: Math.max(
            72,
            (names.get(point.id)?.length ?? 0) * (language === "en" ? 7 : 11) +
              16,
          ),
          height: 24,
        })),
        {
          ...bounds,
          right: Math.max(bounds.left, map.width - 72),
          selectedId,
          obstacles: [...pinPoints, ...clusters, ...cellMarkers],
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
      {clusters.map(({ id, count, x, y }) => (
        <button
          key={id}
          type="button"
          className="local-map-pin is-cluster"
          style={{ left: x, top: y }}
          aria-label={`${localText(language, "Zoom in", "확대")} ${placeCount(language, count)}`}
          onClick={() => map.zoomInto({ x, y })}
        >
          <span className="local-cluster-count">{count}</span>
        </button>
      ))}
      {cellMarkers.map(({ group, x, y }) => {
        const active = scope === group.id;
        return (
          <button
            key={group.id}
            type="button"
            className={`local-map-pin is-cluster${active ? " is-selected" : ""}`}
            data-map-kind="cell"
            style={{ left: x, top: y }}
            aria-label={`${localText(language, "Choose a cell", "구역 선택")} ${placeCount(language, group.places.length)}`}
            aria-pressed={active}
            onClick={() => onGroupSelect?.(group)}
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
            aria-label={numbered ? `${index + 1}. ${label}` : label}
            aria-current={selected ? "true" : undefined}
            title={label}
            onClick={() => onSelect(stop)}
          >
            {numbered ? index + 1 : <span className="local-location-dot" />}
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
