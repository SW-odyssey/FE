import { distanceMeters } from "../map/geometry.ts";
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

/** Compare short itineraries from ranked candidates while avoiding repeat visits. */
export function rankAutoCourses(
  pools: CoursePools,
  slots: VisitSlot[],
  origin: Coordinate | null,
  browse: LocalPlace | null = null,
): CourseLeg[][] {
  let options: { legs: CourseLeg[]; cost: number }[] = [{ legs: [], cost: 0 }];
  for (const slot of slots) {
    const places =
      slot === "afternoon" && browse
        ? [browse]
        : (pools[slot] ?? [])
            .filter((place) => place.category === preferredType[slot])
            .slice(0, 8);
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
  return options.filter(({ legs }) => legs.length).map(({ legs }) => legs);
}

/** Find unused alternatives for one leg, ordered by distance to its neighbors. */
export function autoCourseAlternatives(
  route: CourseLeg[],
  target: VisitSlot,
  pool: LocalPlace[],
  origin: Coordinate | null,
): LocalPlace[] {
  const index = route.findIndex((leg) => leg.slot === target);
  if (index < 0 || route[index].place.category === "culture") return [];
  const before = route[index - 1]?.place ?? origin;
  const after = route[index + 1]?.place;
  return pool
    .filter(
      (place) =>
        place.category === preferredType[target] &&
        !route.some((leg) => leg.place.id === place.id),
    )
    .map((place) => ({
      place,
      distance:
        (before ? distanceMeters(before, place) : 0) +
        (after ? distanceMeters(place, after) : 0),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(({ place }) => place);
}
