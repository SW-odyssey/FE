import type { Coordinate, LocalPlace } from "../discovery/model.ts";

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

export function inMapScope(
  place: LocalPlace,
  scope: string | null | undefined,
): boolean {
  return (
    !scope ||
    scope === `area:${place.area}` ||
    scope === `cell:${previewCell(place).id}`
  );
}

/** Overview counts cover an area; close counts cover one actual 50m cell. */
export function groupMapPlaces(
  places: LocalPlace[],
  close: boolean,
): MapPlaceGroup[] {
  const groups = new Map<string, LocalPlace[]>();
  for (const p of places) {
    const id = close ? `cell:${previewCell(p).id}` : `area:${p.area}`;
    groups.set(id, [...(groups.get(id) ?? []), p]);
  }
  return [...groups].map(([id, members]) => {
    const cell = close ? previewCell(members[0]).polygon : null;
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
