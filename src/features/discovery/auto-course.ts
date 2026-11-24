import { distanceMeters } from "../map/geometry.ts";
import { defaultCourseOptions } from "./course.ts";
import type { Coordinate, LocalPlace, VisitSlot } from "./model.ts";
import { visitSlots } from "./visit-time.ts";

export type CourseLeg = { slot: VisitSlot; place: LocalPlace };
export type CoursePools = Partial<Record<VisitSlot, LocalPlace[]>>;
const preferredType = {
  lunch: "food",
  afternoon: "cafe",
  evening: "food",
  late: "food",
} as const;

/** Return the remaining slots, leaving late night off until requested. */
export function courseSlots(
  start: VisitSlot,
  includeLate: boolean,
): VisitSlot[] {
  return visitSlots
    .slice(visitSlots.indexOf(start))
    .filter((slot) => slot !== "late" || includeLate);
}

/** Rank distinct itineraries for the requested slots, keeping each venue unique within a course. */
export function recommendCourses(
  pools: CoursePools,
  slots: VisitSlot[],
  origin: Coordinate | null,
  afternoon: {
    includeCafe: boolean;
    browsePlace: LocalPlace | null;
  } = { includeCafe: defaultCourseOptions.includeCafe, browsePlace: null },
): CourseLeg[][] {
  let options: { legs: CourseLeg[]; cost: number }[] = [{ legs: [], cost: 0 }];
  const steps = slots.flatMap((slot) => {
    const candidates = new Map<string, LocalPlace>();
    for (const place of pools[slot] ?? []) {
      if (place.category === preferredType[slot] && !candidates.has(place.id))
        candidates.set(place.id, place);
    }
    const primary = { slot, places: [...candidates.values()].slice(0, 8) };
    if (slot !== "afternoon") return [primary];
    return [
      ...(afternoon.includeCafe ? [primary] : []),
      ...(afternoon.browsePlace
        ? [{ slot, places: [afternoon.browsePlace] }]
        : []),
    ];
  });

  for (const { slot, places } of steps) {
    if (!places.length) continue;
    const next = options.flatMap(({ legs, cost }) =>
      places.flatMap((place, rank) => {
        if (legs.some((leg) => leg.place.id === place.id)) return [];
        const previous = legs.at(-1)?.place ?? origin;
        const distance = previous ? distanceMeters(previous, place) : 0;
        return [
          {
            legs: [...legs, { slot, place }],
            cost: cost + rank * 40 + distance,
          },
        ];
      }),
    );
    if (next.length)
      options = next.sort((a, b) => a.cost - b.cost).slice(0, 24);
  }
  return options.map(({ legs }) => legs).filter((legs) => legs.length > 0);
}
