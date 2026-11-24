import type { VisitSlot } from "../model.ts";
import type { CourseReplacement } from "../state/course-url.ts";
import { visitSlots } from "../visit-time.ts";
import {
  getCourse,
  type CourseRequest,
  type CourseResult,
} from "./course-api.ts";

/** Rebuild a suffix using the previous stop as its departure point. */
export async function replaceCourseSuffix(
  request: CourseRequest,
  course: CourseResult,
  change: CourseReplacement,
  signal: AbortSignal,
): Promise<CourseResult | null> {
  const start = visitSlots.indexOf(change.slot);
  const prefix = course.route.filter(
    ({ slot }) => visitSlots.indexOf(slot) < start,
  );
  const suffix = await getCourse(
    {
      ...request,
      seed: course.seed,
      slot: change.slot,
      origin: prefix.at(-1)?.place ?? request.origin,
      excludeIds: [
        ...new Set([
          ...prefix.map(({ place }) => place.id),
          ...change.excludeIds,
        ]),
      ],
    },
    signal,
  );
  if (!suffix.route.length) return null;
  return {
    ...suffix,
    route: [...prefix, ...suffix.route],
    skipped: [
      ...course.skipped.filter(({ slot }) => visitSlots.indexOf(slot) < start),
      ...suffix.skipped,
    ],
  };
}

/** Keep the latest replacement for a time and discard the suffix it supersedes. */
export function appendCourseReplacement(
  changes: CourseReplacement[],
  next: CourseReplacement,
): CourseReplacement[] {
  const start = visitSlots.indexOf(next.slot);
  return [
    ...changes.filter(({ slot }) => visitSlots.indexOf(slot) < start),
    next,
  ];
}

export function courseReplacement(
  course: CourseResult,
  slot: VisitSlot,
): CourseReplacement {
  return {
    slot,
    excludeIds: course.route
      .filter((leg) => leg.slot === slot)
      .map(({ place }) => place.id),
  };
}
