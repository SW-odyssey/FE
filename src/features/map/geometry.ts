import type { Coordinate, LocalPlace } from "../discovery/model.ts";
import { clusterScreenPlaces } from "./clusters.ts";

export type MapPresentation = "areas" | "cells" | "places";

export function mapPresentation(level: number): MapPresentation {
  return level > 4 ? "areas" : level > 2 ? "cells" : "places";
}

export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const r = Math.PI / 180,
    dLat = (b.lat - a.lat) * r,
    dLng = (b.lng - a.lng) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function previewCell(p: Coordinate) {
  const latStep = 50 / 111320,
    lngStep = 50 / (111320 * Math.cos((37.57 * Math.PI) / 180));
  const y = Math.floor((p.lat - 37.56) / latStep),
    x = Math.floor((p.lng - 126.97) / lngStep);
  const lat = 37.56 + y * latStep,
    lng = 126.97 + x * lngStep;
  return {
    id: `${x}:${y}`,
    polygon: [
      [lng, lat],
      [lng + lngStep, lat],
      [lng + lngStep, lat + latStep],
      [lng, lat + latStep],
    ],
  };
}

export type MapPlaceGroup = Coordinate & {
  id: string;
  places: LocalPlace[];
};
export type MapMarkerGroup = MapPlaceGroup & {
  kind: "cluster" | "cell" | "overlap" | "place";
};

export function isOverlapScope(
  scope: string | null | undefined,
): scope is `overlap:${string}` {
  return Boolean(scope?.startsWith("overlap:"));
}

export function inMapScope(
  place: LocalPlace,
  scope: string | null | undefined,
): boolean {
  if (isOverlapScope(scope))
    return scope
      .slice("overlap:".length)
      .split("|")
      .includes(encodeURIComponent(place.id));
  return (
    !scope ||
    scope === `area:${place.area}` ||
    scope === `cell:${place.cellId ?? previewCell(place).id}`
  );
}

/** Overview counts cover an area; close counts cover one actual 50m cell. */
export function groupMapPlaces(
  places: LocalPlace[],
  close: boolean,
): MapPlaceGroup[] {
  const groups = new Map<string, LocalPlace[]>();
  for (const p of places) {
    const id = close
      ? `cell:${p.cellId ?? previewCell(p).id}`
      : `area:${p.area}`;
    groups.set(id, [...(groups.get(id) ?? []), p]);
  }
  return [...groups].map(([id, members]) => {
    const cell =
      close && !members[0].cellId ? previewCell(members[0]).polygon : null;
    return {
      id,
      lat: cell
        ? (cell[0][1] + cell[2][1]) / 2
        : members.reduce((sum, p) => sum + p.lat, 0) / members.length,
      lng: cell
        ? (cell[0][0] + cell[2][0]) / 2
        : members.reduce((sum, p) => sum + p.lng, 0) / members.length,
      places: members,
    };
  });
}

/** Return cells that need a count marker, keeping a selected venue visible as a pin. */
export function groupedMarkerCells(places: LocalPlace[], selectedId?: string) {
  return groupMapPlaces(places, true).filter(
    ({ places: members }) =>
      members.length > 1 && !members.some(({ id }) => id === selectedId),
  );
}

/** Project named pin and cell anchors, combining counts where markers would crowd. */
export function groupMapMarkers(
  places: LocalPlace[],
  project: (point: Coordinate) => { x: number; y: number } | null,
  level: number,
  selectedId?: string,
): MapMarkerGroup[] {
  const mode = mapPresentation(level);
  const cells = mode === "cells" ? groupedMarkerCells(places, selectedId) : [];
  const groupedIds = new Set(
    cells.flatMap((cell) => cell.places.map(({ id }) => id)),
  );
  const anchors = new Map<string, MapMarkerGroup>();
  for (const cell of cells) anchors.set(cell.id, { ...cell, kind: "cell" });
  for (const place of places) {
    if (groupedIds.has(place.id)) continue;
    const id = `place:${place.id}`;
    anchors.set(id, {
      id,
      lat: place.lat,
      lng: place.lng,
      places: [place],
      kind: "place",
    });
  }
  const points = [...anchors.values()].flatMap((group) => {
    const point = project(group);
    return point ? [{ ...point, id: group.id }] : [];
  });
  const atMaxZoom = level <= 1;
  const radius = atMaxZoom
    ? 24
    : ([52, 80, 90][Math.max(0, Math.floor(level) - 2)] ?? 105);
  return clusterScreenPlaces(points, {
    radius,
    selectedId: selectedId ? `place:${selectedId}` : undefined,
  }).map(({ memberIds }) => {
    if (memberIds.length === 1) return anchors.get(memberIds[0])!;
    const members = memberIds.flatMap((id) => anchors.get(id)!.places);
    const ids = members.map(({ id }) => encodeURIComponent(id)).sort();
    const kind = atMaxZoom ? "overlap" : "cluster";
    return {
      id: `${kind}:${ids.join("|")}`,
      lat: members.reduce((sum, place) => sum + place.lat, 0) / members.length,
      lng: members.reduce((sum, place) => sum + place.lng, 0) / members.length,
      places: members,
      kind,
    };
  });
}

/** Cap visible names at a density appropriate to the zoom and available width. */
export function mapCaptionLimit(level: number, width: number) {
  if (level > 4) return 1;
  if (level > 2) return width >= 640 ? 2 : 1;
  if (level > 1) return width >= 640 ? 5 : 3;
  return width >= 640 ? 8 : 5;
}
