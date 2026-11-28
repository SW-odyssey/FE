"use client";
import { useCallback, useEffect, useState } from "react";
import type { DiscoveryLoadStatus } from "../data/types";
import {
  loadServiceMeta,
  peekServiceMeta,
  type ServiceMeta,
} from "../data/service-meta";

type MetaState = {
  attempt: number;
  status: DiscoveryLoadStatus;
  meta?: ServiceMeta;
  error: unknown | null;
};

/**
 * Read the shared GET /api/v2/meta response for the live screens.
 *
 * @param enabled False for the synchronous preview, which has no metadata
 * @returns The current metadata state and a retry that reloads it after a
 * failure or after the shared copy was invalidated
 */
export function useServiceMeta(enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<MetaState>(() => {
    const meta = peekServiceMeta();
    return meta
      ? { attempt: 0, status: "success", meta, error: null }
      : { attempt: 0, status: enabled ? "loading" : "idle", error: null };
  });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    loadServiceMeta(controller.signal).then(
      (meta) => {
        if (!controller.signal.aborted)
          setState({ attempt, status: "success", meta, error: null });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            attempt,
            status: "error",
            meta: previous.meta,
            error,
          }));
      },
    );
    return () => controller.abort();
  }, [enabled, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  if (!enabled) return { status: "idle" as const, meta: undefined, retry };
  const current = state.attempt === attempt || state.status === "success";
  return {
    status: current ? state.status : ("loading" as const),
    meta: state.meta,
    retry,
  };
}
