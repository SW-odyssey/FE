"use client";

import { useEffect, useMemo, useState } from "react";
import {
  courseSlots,
  recommendCourses,
  type CourseLeg,
  type CoursePools,
} from "../auto-course";
import type { CourseOptions } from "../course";
import {
  discoveryQueryKey,
  type DiscoveryDataSource,
  type DiscoveryQuery,
} from "../data";
const emptyPools: CoursePools = {};
const emptyRoute: CourseLeg[] = [];

/** Load the remaining course slots from the active place source. */
export function useAutoCourse(
  source: DiscoveryDataSource,
  query: DiscoveryQuery,
  options: CourseOptions,
  enabled: boolean,
) {
  const key = discoveryQueryKey(query);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the key serializes every query field.
  const input = useMemo(() => query, [key]);
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{
    key: string;
    source: DiscoveryDataSource;
    pools: CoursePools | null;
  }>();
  const { includeCafe, includeBrowse } = options;
  const browsePlace = source.snapshot?.browseCourse?.(input.area) ?? null;
  const lateAvailable = useMemo(
    () =>
      enabled &&
      (!source.snapshot ||
        source.snapshot
          .query({ ...input, slot: "late" })
          .items.some((place) => place.category === "food")),
    [source, input, enabled],
  );
  const includeLate =
    input.slot === "late" || (options.includeLate && lateAvailable);
  const slots = useMemo(
    () => courseSlots(input.slot, includeLate),
    [input.slot, includeLate],
  );
  const hasAfternoon = slots.includes("afternoon");
  const querySlots = useMemo(
    () => (includeCafe ? slots : slots.filter((slot) => slot !== "afternoon")),
    [slots, includeCafe],
  );
  const requestKey = `${key}:${querySlots.join(",")}:${attempt}`;
  const synchronous = useMemo(() => {
    if (!enabled || !source.snapshot) return undefined;
    return Object.fromEntries(
      querySlots.map((slot) => [
        slot,
        source.snapshot!.query({ ...input, slot }).items,
      ]),
    );
  }, [enabled, source, input, querySlots]);

  useEffect(() => {
    if (!enabled || source.snapshot || !querySlots.length) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    void Promise.all(
      querySlots.map(async (slot) => [
        slot,
        (await source.query({ ...input, slot }, options)).items,
      ]),
    ).then(
      (values) => {
        if (!options.signal.aborted)
          setResponse({
            key: requestKey,
            source,
            pools: Object.fromEntries(values),
          });
      },
      () => {
        if (!options.signal.aborted)
          setResponse({ key: requestKey, source, pools: null });
      },
    );
    return () => controller.abort();
  }, [enabled, source, input, querySlots, requestKey]);

  const matched =
    response?.key === requestKey && response.source === source
      ? response
      : undefined;
  const pools = synchronous ?? matched?.pools ?? emptyPools;
  const routes = useMemo(
    () =>
      recommendCourses(pools, slots, input.origin, {
        includeCafe,
        browsePlace: includeBrowse ? browsePlace : null,
      }),
    [pools, slots, input.origin, includeCafe, includeBrowse, browsePlace],
  );
  const selectionKey = `${requestKey}:${includeBrowse ? (browsePlace?.id ?? "") : ""}`;
  const [selection, setSelection] = useState<{
    key: string;
    source: DiscoveryDataSource;
    index: number;
  }>();
  const index =
    selection?.key === selectionKey && selection.source === source
      ? selection.index % Math.max(1, routes.length)
      : 0;
  const route = routes[index] ?? emptyRoute;
  function suggestAnother() {
    if (routes.length < 2) return;
    setSelection((previous) => {
      const currentIndex =
        previous?.key === selectionKey && previous.source === source
          ? previous.index % routes.length
          : 0;
      const current = routes[currentIndex];
      const visited = new Set(current.map(({ place }) => place.id));
      // Prefer a different mix of places before falling back to a different order.
      for (let step = 1; step < routes.length; step++) {
        const next = (currentIndex + step) % routes.length;
        if (routes[next].some(({ place }) => !visited.has(place.id)))
          return { key: selectionKey, source, index: next };
      }
      return {
        key: selectionKey,
        source,
        index: (currentIndex + 1) % routes.length,
      };
    });
  }

  return {
    route,
    canSuggestAnother: routes.length > 1,
    suggestAnother,
    canIncludeCafe: hasAfternoon,
    canIncludeBrowse: Boolean(browsePlace && hasAfternoon),
    canIncludeLate: input.slot !== "late" && lateAvailable,
    status:
      source.snapshot || !querySlots.length
        ? ("success" as const)
        : matched
          ? matched.pools
            ? ("success" as const)
            : ("error" as const)
          : ("loading" as const),
    retry: () => setAttempt((value) => value + 1),
  };
}
