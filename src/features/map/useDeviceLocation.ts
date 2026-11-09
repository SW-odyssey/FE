"use client";

import { useEffect, useRef, useState } from "react";
import type { Coordinate } from "../discovery/model";

type LocationStatus = "idle" | "locating" | "denied" | "unavailable";

export function useDeviceLocation(onLocate: (point: Coordinate) => void) {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const pending = useRef<symbol | null>(null);

  useEffect(
    () => () => {
      pending.current = null;
    },
    [],
  );

  function locate() {
    if (pending.current) return;
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    const request = Symbol();
    pending.current = request;
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (pending.current !== request) return;
        pending.current = null;
        setStatus("idle");
        onLocate({ lat: coords.latitude, lng: coords.longitude });
      },
      (error) => {
        if (pending.current !== request) return;
        pending.current = null;
        setStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        );
      },
      { maximumAge: 0, timeout: 10_000, enableHighAccuracy: true },
    );
  }

  return { locate, status };
}
