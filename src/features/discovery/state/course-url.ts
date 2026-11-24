import type { VisitSlot } from "../model.ts";
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
  previousStopIds?: string[];
  replacements: CourseReplacement[];
};

const numericId = /^[1-9]\d{0,15}$/;

export function readCourseLink(
  params: URLSearchParams,
): CourseLink | undefined {
  const seed = params.get("seed");
  if (!seed || !/^-?\d+$/.test(seed) || !Number.isSafeInteger(Number(seed)))
    return;
  const dataset = params.get("courseDataset");
  const date = params.get("courseDate");
  const slot = params.get("courseStart") as VisitSlot;
  const previousStopIds = params.get("previousStopIds")?.split(",");
  const validPreviousStops =
    previousStopIds &&
    previousStopIds.length <= 6 &&
    previousStopIds.every(
      (id) => numericId.test(id) && Number.isSafeInteger(Number(id)),
    );
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
      excludeIds.every(
        (id) => numericId.test(id) && Number.isSafeInteger(Number(id)),
      ) &&
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
    ...(validPreviousStops && { previousStopIds }),
    replacements,
  };
}

export function writeCourseLink(params: URLSearchParams, link: CourseLink) {
  params.set("seed", String(link.seed));
  if (link.datasetId) params.set("courseDataset", link.datasetId);
  if (link.visitDate) params.set("courseDate", link.visitDate);
  if (link.startSlot) params.set("courseStart", link.startSlot);
  if (link.previousStopIds?.length)
    params.set("previousStopIds", link.previousStopIds.join(","));
  if (link.replacements.length)
    params.set(
      "courseChanges",
      link.replacements
        .map(({ slot, excludeIds }) => `${slot}:${excludeIds.join(",")}`)
        .join(";"),
    );
}
