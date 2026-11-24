"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Coordinate } from "../discovery/model.ts";
import {
  type ExploreMapOptions,
  type ExploreMapProps,
  type ExploreMapSession,
} from "./controller.ts";
import { createGoogleExploreMapSession } from "./google/session.ts";
import { createExploreMapSession } from "./kakao/session.ts";
import { attachPreferredMapSession, type MapProvider } from "./provider.ts";

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
  const [provider, setProvider] = useState<MapProvider | null>(null);
  const ready = provider !== null;
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(5);
  const [retry, setRetry] = useState(0);
  const [draggedPlaces, setDraggedPlaces] =
    useState<ExploreMapProps["places"]>();
  const displayed = props.courseStops ?? props.places;
  const fitKey = JSON.stringify(
    displayed.map(({ id, lat, lng }) => [id, lat, lng]),
  );
  const focusKey = props.selected
    ? JSON.stringify([
        props.selected.id,
        props.selected.lat,
        props.selected.lng,
      ])
    : null;
  useEffect(() => {
    const read = (): ExploreMapOptions => ({
      ...options.current,
      onSelect: (place) => options.current.onSelect(place),
      onGroupSelect: (group) => options.current.onGroupSelect?.(group),
      onViewportDrag: () => {
        if (options.current.onSearchArea)
          setDraggedPlaces(options.current.places);
      },
    });
    return attachPreferredMapSession(
      {
        google: () =>
          createGoogleExploreMapSession(element.current!, read, setZoom),
        kakao: () => createExploreMapSession(element.current!, read, setZoom),
      },
      (next, provider) => {
        session.current = next;
        setProvider(provider);
      },
      (failed) => {
        session.current = null;
        setProvider(null);
        setError(failed);
      },
    );
  }, [retry]);
  useEffect(() => {
    if (!ready) return;
    session.current?.render();
  }, [
    props.places,
    props.courseStops,
    props.selected,
    props.language,
    props.scope,
    props.sheetInset,
    props.viewportScale,
    props.viewportInsets,
    ready,
    zoom,
  ]);
  useEffect(() => {
    if (ready && !props.searchOrigin) session.current?.fitRecommendations(true);
  }, [fitKey, ready, props.searchOrigin]);
  useEffect(() => {
    if (ready) session.current?.focusSelected();
  }, [focusKey, ready, props.focusSelected, props.focusRequest]);
  useEffect(() => {
    if (ready && props.currentLocation) {
      session.current?.setCurrentLocation(props.currentLocation);
    }
  }, [ready, props.currentLocation]);
  return {
    element,
    provider,
    ready,
    error,
    zoom,
    retry: () => {
      setError(false);
      setRetry((value) => value + 1);
    },
    zoomBy: (delta: number) => session.current?.zoomBy(delta),
    fitRecommendations: () => {
      setDraggedPlaces(undefined);
      session.current?.fitRecommendations();
    },
    centerOn: (point: Coordinate) => {
      setDraggedPlaces(undefined);
      session.current?.centerOn(point);
    },
    canSearchArea:
      ready && Boolean(props.onSearchArea) && draggedPlaces === props.places,
    searchArea: () => {
      const point = session.current?.getCenter();
      if (!point) return;
      setDraggedPlaces(undefined);
      props.onSearchArea?.(point);
    },
  };
}
