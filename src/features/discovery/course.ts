import { distanceMeters } from "../map/geometry.ts";
import type { LocalPlace } from "./model.ts";

export type CourseStop = Pick<
  LocalPlace,
  "id" | "name" | "koreanName" | "area" | "category" | "image" | "lat" | "lng"
>;

export const COURSE_STORAGE_KEY = "local.course.v1";

/** Read locally stored stops, ignoring invalid and duplicate entries. */
export function readCourse(value: string | null): CourseStop[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const stops: CourseStop[] = [];
    for (const stop of parsed) {
      if (
        stop &&
        typeof stop === "object" &&
        typeof stop.id === "string" &&
        stop.id &&
        typeof stop.name === "string" &&
        typeof stop.koreanName === "string" &&
        typeof stop.image === "string" &&
        ["jongno", "ikseon", "insa", "eulji", "bukchon"].includes(stop.area) &&
        ["cafe", "food", "culture"].includes(stop.category) &&
        Number.isFinite(stop.lat) &&
        Number.isFinite(stop.lng) &&
        Math.abs(stop.lat) <= 90 &&
        Math.abs(stop.lng) <= 180 &&
        !stops.some(({ id }) => id === stop.id)
      ) {
        stops.push(stop);
      }
    }
    return stops;
  } catch {
    return [];
  }
}

/** Move a stop one position in visit order. */
export function moveCourseStop(
  stops: CourseStop[],
  id: string,
  offset: -1 | 1,
): CourseStop[] {
  const from = stops.findIndex((stop) => stop.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= stops.length) return stops;
  const next = stops.slice();
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** Rank up to four unselected recommendations around the last stop. */
export function courseCandidates(
  places: LocalPlace[],
  stops: readonly CourseStop[],
): LocalPlace[] {
  const taken = new Set(stops.map(({ id }) => id));
  const candidates = places.filter((place) => !taken.has(place.id));
  const last = stops.at(-1);
  return (
    last
      ? candidates
          .map((place) => ({ place, meters: distanceMeters(last, place) }))
          .sort((a, b) => a.meters - b.meters)
          .map(({ place }) => place)
      : candidates
  ).slice(0, 4);
}
