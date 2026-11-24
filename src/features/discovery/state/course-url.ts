import type { Coordinate, VisitSlot } from "../model.ts";
import { visitSlots } from "../visit-time.ts";

export type CourseReplacement = {
  slot: VisitSlot;
  excludeIds: string[];
};

export type CourseLink = {
  seed: number;
  datasetId?: string;
  visitDate?: string;
  startSlot?: VisitSlot;
  origin?: Coordinate;
  previousStopIds?: string[];
  replacements: CourseReplacement[];
};

function isCoursePlaceId(id: string): boolean {
  return /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id));
}

export function readCourseLink(
  params: URLSearchParams,
): CourseLink | undefined {
  const seed = params.get("seed");
  if (!seed || !/^-?\d+$/.test(seed) || !Number.isSafeInteger(Number(seed)))
    return;
  const dataset = params.get("courseDataset");
  const date = params.get("courseDate");
  const slot = params.get("courseStart") as VisitSlot;
  const linkedLat = params.get("courseLat")?.trim();
  const linkedLng = params.get("courseLng")?.trim();
  const lat = Number(linkedLat);
  const lng = Number(linkedLng);
  const origin =
    linkedLat && linkedLng && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat, lng }
      : undefined;
  const previousStopIds = params.get("previousStopIds")?.split(",");
  const validPreviousStops =
    previousStopIds &&
    previousStopIds.length <= 6 &&
    previousStopIds.every(isCoursePlaceId);
  const replacements: CourseReplacement[] = [];
  for (const entry of (params.get("courseChanges") ?? "")
    .split(";")
    .slice(0, visitSlots.length)) {
    const [time, ids] = entry.split(":", 2);
    const changeSlot = time as VisitSlot;
    const excludeIds = ids?.split(",") ?? [];
    if (
      visitSlots.includes(changeSlot) &&
      excludeIds.length <= 2 &&
      excludeIds.every(isCoursePlaceId) &&
      !replacements.some(({ slot }) => slot === changeSlot)
    ) {
      replacements.push({ slot: changeSlot, excludeIds });
    }
  }
  replacements.sort(
    (a, b) => visitSlots.indexOf(a.slot) - visitSlots.indexOf(b.slot),
  );
  return {
    seed: Number(seed),
    datasetId:
      dataset && /^[a-zA-Z0-9-]{1,80}$/.test(dataset) ? dataset : undefined,
    visitDate:
      date &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      Number.isFinite(Date.parse(date))
        ? date
        : undefined,
    startSlot: visitSlots.includes(slot) ? slot : undefined,
    ...(origin && { origin }),
    ...(validPreviousStops && { previousStopIds }),
    replacements,
  };
}

export function writeCourseLink(params: URLSearchParams, link: CourseLink) {
  params.set("seed", String(link.seed));
  if (link.datasetId) params.set("courseDataset", link.datasetId);
  if (link.visitDate) params.set("courseDate", link.visitDate);
  if (link.startSlot) params.set("courseStart", link.startSlot);
  if (link.origin) {
    params.set("courseLat", String(link.origin.lat));
    params.set("courseLng", String(link.origin.lng));
  }
  const previousStopIds = link.previousStopIds?.filter(isCoursePlaceId);
  if (previousStopIds?.length)
    params.set("previousStopIds", previousStopIds.join(","));
  const changes = link.replacements.flatMap(({ slot, excludeIds }) => {
    const ids = excludeIds.filter(isCoursePlaceId);
    return ids.length ? [`${slot}:${ids.join(",")}`] : [];
  });
  if (changes.length) params.set("courseChanges", changes.join(";"));
}
