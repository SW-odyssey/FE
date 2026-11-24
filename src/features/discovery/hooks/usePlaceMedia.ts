"use client";

import { useEffect, useState } from "react";
import {
  getPlaceMedia,
  hasPlaceMedia,
  type PlaceMedia,
} from "../data/place-media";
import type { LocalPlace } from "../model";

/** Load the photo gallery only for the place whose detail is open. */
export function usePlaceMedia(place: LocalPlace) {
  const { id } = place;
  const enabled = hasPlaceMedia(place);
  const [response, setResponse] = useState<{ id: string; data: PlaceMedia }>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void getPlaceMedia(id, "gallery").then(
      (data) => {
        if (active) setResponse({ id, data });
      },
      () => {
        if (active) setResponse({ id, data: { photoList: [] } });
      },
    );
    return () => {
      active = false;
    };
  }, [enabled, id]);
  return {
    media: response?.id === id ? response.data : undefined,
    pending: enabled && response?.id !== id,
  };
}
