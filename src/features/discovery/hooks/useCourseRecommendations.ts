"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CourseOptions } from "../course";
import {
  courseOrigin,
  getCourse,
  getCourseDataset,
  type CourseRequest,
  type CourseResult,
} from "../data/course-api";
import {
  appendCourseReplacement,
  courseReplacement,
  replaceCourseSuffix,
} from "../data/course-replacement";
import { createLatestRequest } from "../data/latest-request";
import type {
  Coordinate,
  DiscoveryArea,
  DiscoveryLanguage,
  VisitSlot,
} from "../model";
import type { CourseLink } from "../state/course-url";

const emptyRoute: CourseResult["route"] = [];
const emptySkipped: CourseResult["skipped"] = [];

type LoadedCourse = {
  result: CourseResult;
  link: CourseLink;
};

type CourseState = {
  key: string;
  contextKey: string;
  loaded: LoadedCourse | null;
  pending: boolean;
  error?: "load" | "replace" | "no-replacement";
};

/** Load, replay, or replace the selected itinerary while ignoring obsolete requests. */
export function useCourseRecommendations({
  area,
  origin,
  slot,
  visitDate,
  initialLink,
  options,
  language,
  enabled,
}: {
  area: DiscoveryArea;
  origin: Coordinate | null;
  slot: VisitSlot;
  visitDate: string;
  initialLink?: CourseLink;
  options: CourseOptions;
  language: DiscoveryLanguage;
  enabled: boolean;
}) {
  const { lat, lng } = origin ?? courseOrigin(area);
  const start = initialLink?.startSlot ?? slot;
  const date = initialLink?.visitDate ?? visitDate;
  const [attempt, setAttempt] = useState(0);
  const contextKey = JSON.stringify([lat, lng, start, date]);
  const key = JSON.stringify([
    contextKey,
    initialLink,
    options,
    language,
    attempt,
  ]);
  const [state, setState] = useState<CourseState>();
  const latest = useRef<CourseState>(undefined);
  const lane = useMemo(() => createLatestRequest<LoadedCourse | null>(), []);
  const dataset = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (latest.current?.key === key && !latest.current.pending) return;
    return lane.run(
      async (signal) => {
        const datasetId =
          initialLink?.datasetId ??
          dataset.current ??
          (await getCourseDataset(signal));
        signal.throwIfAborted();
        if (!initialLink?.datasetId) dataset.current = datasetId;
        const request = {
          datasetId,
          origin: { lat, lng },
          slot: start,
          visitDate: date,
          seed: initialLink?.seed,
          options,
          language,
        };
        let result = await getCourse(request, signal);
        const replacements = [];
        for (const change of initialLink?.replacements ?? []) {
          const suffix = await replaceCourseSuffix(
            request,
            result,
            change,
            signal,
          );
          if (!suffix) break;
          result = suffix;
          replacements.push(change);
        }
        return {
          result,
          link: {
            seed: result.seed,
            datasetId,
            visitDate: date,
            startSlot: start,
            replacements,
          },
        };
      },
      {
        resolve: (loaded) => {
          const next = { key, contextKey, loaded, pending: false };
          latest.current = next;
          setState(next);
        },
        reject: () => {
          dataset.current = null;
          const next = {
            key,
            contextKey,
            loaded: null,
            pending: false,
            error: "load",
          } as const;
          latest.current = next;
          setState(next);
        },
      },
    );
  }, [
    enabled,
    key,
    contextKey,
    lane,
    lat,
    lng,
    start,
    date,
    initialLink,
    options,
    language,
  ]);

  useEffect(() => lane.cancel, [enabled, key, lane]);

  const current = state?.key === key ? state : undefined;
  const loaded = current?.loaded;
  const previous =
    !current && state?.contextKey === contextKey ? state.loaded : null;
  const result = loaded?.result ?? previous?.result;

  function regenerate(slot?: VisitSlot) {
    if (!loaded || latest.current?.pending) return;
    const request: CourseRequest = {
      datasetId: loaded.result.datasetId,
      origin: { lat, lng },
      slot: start,
      visitDate: date,
      options,
      language,
    };
    const pending = { ...current, pending: true, error: undefined };
    latest.current = pending;
    setState(pending);
    lane.run(
      async (signal) => {
        if (slot) {
          const change = courseReplacement(loaded.result, slot);
          const result = await replaceCourseSuffix(
            request,
            loaded.result,
            change,
            signal,
          );
          return (
            result && {
              result,
              link: {
                ...loaded.link,
                replacements: appendCourseReplacement(
                  loaded.link.replacements,
                  change,
                ),
              },
            }
          );
        }
        const seed =
          loaded.result.seed === Number.MAX_SAFE_INTEGER
            ? 1
            : loaded.result.seed + 1;
        const result = await getCourse({ ...request, seed }, signal);
        return {
          result,
          link: { ...loaded.link, seed: result.seed, replacements: [] },
        };
      },
      {
        resolve: (replacement) => {
          const next = {
            key,
            contextKey,
            loaded: replacement ?? loaded,
            pending: false,
            error: replacement ? undefined : ("no-replacement" as const),
          };
          latest.current = next;
          setState(next);
        },
        reject: () => {
          const next = {
            key,
            contextKey,
            loaded,
            pending: false,
            error: "replace",
          } as const;
          latest.current = next;
          setState(next);
        },
      },
    );
  }

  return {
    route: result?.route ?? emptyRoute,
    skipped: result?.skipped ?? emptySkipped,
    interruption: result?.interruption ?? null,
    pending: current?.pending ?? Boolean(previous),
    error: current?.error,
    link: loaded?.link,
    canRegenerate: Boolean(loaded),
    status: !current
      ? previous
        ? ("success" as const)
        : ("loading" as const)
      : loaded
        ? ("success" as const)
        : ("error" as const),
    retry: () => setAttempt((value) => value + 1),
    regenerate,
  };
}
