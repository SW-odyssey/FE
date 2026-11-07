"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  attachMapSession,
  type ExploreMapOptions,
  type ExploreMapProps,
  type ExploreMapSession,
} from "./controller.ts";
import { createExploreMapSession, prepareKakaoMap } from "./kakao/session.ts";

/** Bind the view's state to one provider session and discard late SDK completions.
 * @param props Current places, selection, callbacks and uncovered map size
 * @returns Canvas ref, loading state and provider-neutral map controls
 */
export function useExploreMap(props: ExploreMapProps) {
  const element = useRef<HTMLDivElement>(null);
  const session = useRef<ExploreMapSession | null>(null);
  const options = useRef<ExploreMapOptions>({
    ...props,
    sheetInset: props.sheetInset ?? 320,
    viewportScale: props.viewportScale ?? 1,
  });
  useLayoutEffect(() => {
    options.current = {
      ...props,
      sheetInset: props.sheetInset ?? 320,
      viewportScale: props.viewportScale ?? 1,
    };
  }, [props]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(5);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    return attachMapSession(
      prepareKakaoMap,
      () =>
        createExploreMapSession(
          element.current!,
          () => ({
            ...options.current,
            onSelect: (place) => options.current.onSelect(place),
            onGroupSelect: (group) => options.current.onGroupSelect?.(group),
          }),
          setZoom,
        ),
      (next) => {
        session.current = next;
        setReady(true);
      },
      () => setError(true),
    );
  }, [retry]);
  useEffect(() => {
    if (!ready) return;
    session.current?.render();
  }, [
    props.places,
    props.selected,
    props.language,
    props.scope,
    props.sheetInset,
    props.viewportScale,
    ready,
    zoom,
  ]);
  useEffect(() => {
    if (ready) session.current?.fitRecommendations(true);
  }, [props.places, ready]);
  useEffect(() => {
    if (ready) session.current?.focusSelected();
  }, [props.selected, ready, props.focusSelected]);
  return {
    element,
    ready,
    error,
    zoom,
    retry: () => {
      setError(false);
      setRetry((value) => value + 1);
    },
    zoomBy: (delta: number) => session.current?.zoomBy(delta),
    fitRecommendations: () => session.current?.fitRecommendations(),
    centerOnOrigin: () => {
      if (props.origin) session.current?.centerOn(props.origin);
    },
  };
}
