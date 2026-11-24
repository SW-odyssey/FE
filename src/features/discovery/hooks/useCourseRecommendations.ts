"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  courseOrigin,
  getCourse,
  getCourseDataset,
  type CourseResult,
} from "../data/course-api";
import { createLatestRequest } from "../data/latest-request";
import type { Coordinate, DiscoveryArea, VisitSlot } from "../model";

const emptyRoute: CourseResult["route"] = [];
const emptySkipped: CourseResult["skipped"] = [];

/** Resolve the current course selection against the published recommendation API. */
export function useCourseRecommendations({
  area,
  origin,
  slot,
  visitDate,
  enabled,
}: {
  area: DiscoveryArea;
  origin: Coordinate | null;
  slot: VisitSlot;
  visitDate: string;
  enabled: boolean;
}) {
  const { lat, lng } = origin ?? courseOrigin(area);
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([lat, lng, slot, visitDate, attempt]);
  const [response, setResponse] = useState<{
    key: string;
    value: CourseResult | null;
  }>();
  const lane = useMemo(() => createLatestRequest<CourseResult>(), []);
  const dataset = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return lane.run(
      async (signal) => {
        const datasetId = dataset.current ?? (await getCourseDataset(signal));
        signal.throwIfAborted();
        dataset.current = datasetId;
        return getCourse(
          { datasetId, origin: { lat, lng }, slot, visitDate },
          signal,
        );
      },
      {
        resolve: (value) => setResponse({ key, value }),
        reject: () => {
          dataset.current = null;
          setResponse({ key, value: null });
        },
      },
    );
  }, [enabled, key, lane, lat, lng, slot, visitDate]);

  const current = response?.key === key ? response : undefined;
  const result = current?.value;
  return {
    route: result?.route ?? emptyRoute,
    skipped: result?.skipped ?? emptySkipped,
    interruption: result?.interruption ?? null,
    status: !current
      ? ("loading" as const)
      : result
        ? ("success" as const)
        : ("error" as const),
    retry: () => setAttempt((value) => value + 1),
  };
}
