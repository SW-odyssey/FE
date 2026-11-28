"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CourseOptions } from "../course";
import {
  getCourse,
  type CourseRequest,
  type CourseResult,
} from "../data/course-api";
import {
  appendCourseReplacement,
  courseReplacement,
  replaceCourseSuffix,
} from "../data/course-replacement";
import { getCourseNames } from "../data/course-names";
import { createLatestRequest } from "../data/latest-request";
import {
  areaCenter,
  hasDataset,
  invalidateServiceMeta,
  isMissingDatasetResponse,
  loadServiceMeta,
  selectDataset,
  type ServiceMeta,
} from "../data/service-meta";
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
  /** Language the result's names were requested in. */
  language: DiscoveryLanguage;
};

/** A loaded course carried across the page reload of a language switch. */
export type CourseSnapshot = LoadedCourse & { key: string };

type StopNames = {
  ids: string;
  language: DiscoveryLanguage;
  byId: Record<string, string>;
};

/** Everything that decides the stores of a course, but not its language. */
function courseKey(
  context: string,
  options: CourseOptions,
  link: CourseLink | undefined,
) {
  return JSON.stringify([
    context,
    options.afternoon,
    options.lateNight,
    options.walk,
    link?.seed ?? null,
    link?.datasetId ?? null,
    link?.previousStopIds ?? [],
    link?.replacements ?? [],
  ]);
}

type CourseState = {
  key: string;
  resolvedKey?: string;
  contextKey: string;
  loaded: LoadedCourse | null;
  pending: boolean;
  rebuildVersion?: number;
  error?: "load" | "replace" | "no-replacement";
};

function matchesCourse(state: CourseState | undefined, key: string) {
  return state?.key === key || state?.resolvedKey === key;
}

/** Load, replay, or replace the selected itinerary while ignoring obsolete requests. */
export function useCourseRecommendations({
  area,
  origin,
  slot,
  visitDate,
  initialLink,
  options,
  language,
  meta,
  restored,
  enabled,
}: {
  area: DiscoveryArea;
  origin: Coordinate | null;
  slot: VisitSlot;
  visitDate: string;
  initialLink?: CourseLink;
  options: CourseOptions;
  language: DiscoveryLanguage;
  /** Shared metadata; the course waits for it to know the area centre. */
  meta: ServiceMeta | undefined;
  /** A course loaded before a language reload; used once if it still matches. */
  restored?: CourseSnapshot;
  enabled: boolean;
}) {
  const departure = initialLink?.origin ?? origin;
  const hasCustomOrigin = Boolean(departure);
  const center = departure ?? (meta ? areaCenter(meta, area) : null);
  const lat = center ? Number(center.lat.toFixed(5)) : null;
  const lng = center ? Number(center.lng.toFixed(5)) : null;
  const start = initialLink?.startSlot ?? slot;
  const date = initialLink?.visitDate ?? visitDate;
  const [attempt, setAttempt] = useState(0);
  const contextKey = JSON.stringify([lat, lng, start, date]);
  // Language is not part of the key: switching it keeps the same course and
  // only refreshes the stop names below.
  const settingsKey = JSON.stringify([contextKey, options, attempt]);
  const key = JSON.stringify([settingsKey, initialLink]);
  const [state, setState] = useState<CourseState>();
  const latest = useRef<CourseState>(undefined);
  const lane = useMemo(() => createLatestRequest<LoadedCourse | null>(), []);
  const ready = enabled && lat !== null && lng !== null;
  const languageRef = useRef(language);
  const restoredRef = useRef(restored);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  useEffect(() => {
    restoredRef.current = restored;
  }, [restored]);

  useEffect(() => {
    if (!ready || lat === null || lng === null) return;
    if (matchesCourse(latest.current, key) && !latest.current?.pending) return;
    return lane.run(
      async (signal) => {
        const published = await loadServiceMeta(signal);
        // A link to a retired dataset cannot replay its seed or swaps, so it
        // starts a new course from the current default dataset instead.
        const link =
          initialLink?.datasetId &&
          !hasDataset(published, initialLink.datasetId)
            ? undefined
            : initialLink;
        const datasetId = selectDataset(published, link?.datasetId).id;
        const requestLanguage = languageRef.current;
        const carried = restoredRef.current;
        restoredRef.current = undefined;
        if (
          carried &&
          link &&
          carried.key === courseKey(contextKey, options, link)
        )
          return { result: carried.result, link, language: carried.language };
        const request = {
          datasetId,
          origin: { lat, lng },
          slot: start,
          visitDate: date,
          seed: link?.seed,
          options,
          language: requestLanguage,
        };
        const previousStopIds = link?.previousStopIds;
        let result = await getCourse({ ...request, previousStopIds }, signal);
        const replacements = [];
        for (const change of link?.replacements ?? []) {
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
            ...(hasCustomOrigin && { origin: request.origin }),
            previousStopIds,
            replacements,
          },
          language: requestLanguage,
        };
      },
      {
        resolve: (loaded) => {
          const next = {
            key,
            contextKey,
            loaded,
            resolvedKey: loaded
              ? JSON.stringify([settingsKey, loaded.link])
              : undefined,
            pending: false,
          };
          latest.current = next;
          setState(next);
        },
        reject: (error) => {
          if (isMissingDatasetResponse(error)) invalidateServiceMeta();
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
    ready,
    key,
    settingsKey,
    contextKey,
    lane,
    hasCustomOrigin,
    lat,
    lng,
    start,
    date,
    initialLink,
    options,
  ]);

  useEffect(() => lane.cancel, [ready, key, lane]);

  const current = matchesCourse(state, key) ? state : undefined;
  const loaded = current?.loaded;
  const previous =
    !current && state?.contextKey === contextKey ? state.loaded : null;
  const result = loaded?.result ?? previous?.result;

  function regenerate(slot?: VisitSlot) {
    if (!loaded || latest.current?.pending || lat === null || lng === null)
      return;
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
              language,
            }
          );
        }
        const seed =
          loaded.result.seed === Number.MAX_SAFE_INTEGER
            ? 1
            : loaded.result.seed + 1;
        const previousStopIds = loaded.result.route.map(
          ({ place }) => place.id,
        );
        const result = await getCourse(
          { ...request, seed, previousStopIds },
          signal,
        );
        return {
          result,
          link: {
            ...loaded.link,
            seed: result.seed,
            previousStopIds,
            replacements: [],
          },
          language,
        };
      },
      {
        resolve: (replacement) => {
          const nextCourse = replacement ?? loaded;
          const next = {
            key,
            contextKey,
            loaded: nextCourse,
            resolvedKey: JSON.stringify([settingsKey, nextCourse.link]),
            pending: false,
            rebuildVersion:
              (current?.rebuildVersion ?? 0) + (replacement && !slot ? 1 : 0),
            error: replacement ? undefined : ("no-replacement" as const),
          };
          latest.current = next;
          setState(next);
        },
        reject: () => {
          const next = {
            ...current,
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

  // Refresh only the names when the language differs from the loaded one.
  const shown = loaded ?? previous ?? undefined;
  const routeIds = shown?.result.route.map(({ place }) => place.id).join(",");
  const namesLane = useMemo(() => createLatestRequest<StopNames>(), []);
  const [names, setNames] = useState<StopNames>();
  useEffect(() => {
    if (!routeIds || !shown || shown.language === language) {
      namesLane.cancel();
      return;
    }
    return namesLane.run(
      async (signal) => ({
        ids: routeIds,
        language,
        byId: await getCourseNames(routeIds.split(","), language, signal),
      }),
      { resolve: setNames, reject: () => undefined },
    );
  }, [routeIds, shown, language, namesLane]);
  const route = useMemo(() => {
    const base = result?.route ?? emptyRoute;
    if (!names || names.ids !== routeIds || names.language !== language)
      return base;
    return base.map((stop) => {
      const name = names.byId[stop.place.id];
      return name
        ? {
            ...stop,
            place: {
              ...stop.place,
              name,
              ...(language === "ko" && { koreanName: name }),
            },
          }
        : stop;
    });
  }, [result?.route, names, routeIds, language]);

  return {
    route,
    snapshot: loaded
      ? {
          ...loaded,
          key: courseKey(contextKey, options, loaded.link),
          result: { ...loaded.result, route },
          language:
            names?.ids === routeIds && names?.language === language
              ? language
              : loaded.language,
        }
      : undefined,
    skipped: result?.skipped ?? emptySkipped,
    interruption: result?.interruption ?? null,
    pending: current?.pending ?? Boolean(previous),
    rebuildVersion: state?.rebuildVersion ?? 0,
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
