"use client";

import { useEffect, useMemo, useState } from "react";
import { courseSlots, rankAutoCourses, type CoursePools } from "../auto-course";
import {
  discoveryQueryKey,
  type DiscoveryDataSource,
  type DiscoveryQuery,
} from "../data";
import type { LocalPlace, VisitSlot } from "../model";

const emptyPools: CoursePools = {};
const emptyReplacements: Partial<Record<VisitSlot, LocalPlace>> = {};

/** Load the remaining course slots from the active place source. */
export function useAutoCourse(
  source: DiscoveryDataSource,
  query: DiscoveryQuery,
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
  const [selection, setSelection] = useState<{
    key: string;
    round: number;
    browse: boolean;
    late: boolean;
    replacements: Partial<Record<VisitSlot, LocalPlace>>;
  }>();
  const picked =
    selection?.key === key
      ? selection
      : {
          key,
          round: 0,
          browse: false,
          late: false,
          replacements: emptyReplacements,
        };
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
  const includeLate = picked.late || input.slot === "late";
  const slots = useMemo(
    () => courseSlots(input.slot, includeLate),
    [input.slot, includeLate],
  );
  const requestKey = `${key}:${slots.join(",")}:${attempt}`;
  const synchronous = useMemo(() => {
    if (!enabled || !source.snapshot) return undefined;
    return Object.fromEntries(
      slots.map((slot) => [
        slot,
        source.snapshot!.query({ ...input, slot }).items,
      ]),
    );
  }, [enabled, source, input, slots]);

  useEffect(() => {
    if (!enabled || source.snapshot || !slots.length) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    void Promise.all(
      slots.map(async (slot) => [
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
  }, [enabled, source, input, slots, requestKey]);

  const matched =
    response?.key === requestKey && response.source === source
      ? response
      : undefined;
  const pools = synchronous ?? matched?.pools ?? emptyPools;
  const options = useMemo(
    () =>
      rankAutoCourses(
        pools,
        slots,
        input.origin,
        picked.browse ? browsePlace : null,
      ),
    [pools, slots, input.origin, picked.browse, browsePlace],
  );
  const route = useMemo(() => {
    const base = options[picked.round % options.length] ?? [];
    return base.map((leg) => ({
      ...leg,
      place: picked.replacements[leg.slot] ?? leg.place,
    }));
  }, [options, picked.round, picked.replacements]);

  return {
    route,
    isPreview: Boolean(source.snapshot),
    pools,
    origin: input.origin,
    hasOther: options.length > 1,
    canBrowse: Boolean(
      browsePlace &&
      slots.includes("afternoon") &&
      (pools.afternoon?.length || picked.browse),
    ),
    canIncludeLate: input.slot !== "late" && lateAvailable,
    includeLate,
    browse: picked.browse,
    status:
      source.snapshot || !slots.length
        ? ("success" as const)
        : matched
          ? matched.pools
            ? ("success" as const)
            : ("error" as const)
          : ("loading" as const),
    retry: () => setAttempt((value) => value + 1),
    changeAfternoon: (browse: boolean) =>
      setSelection({ ...picked, browse, replacements: {}, round: 0 }),
    toggleLate: () =>
      setSelection({
        ...picked,
        late: !picked.late,
        replacements: {},
        round: 0,
      }),
    reroll: () =>
      setSelection({ ...picked, round: picked.round + 1, replacements: {} }),
    replace: (slot: VisitSlot, place: LocalPlace) =>
      setSelection({
        ...picked,
        replacements: { ...picked.replacements, [slot]: place },
      }),
  };
}
