"use client";

import { useEffect, useState } from "react";
import {
  getPlaceMedia,
  hasPlaceMedia,
  type PlaceMedia,
} from "../data/place-media";
import type { DiscoveryLanguage, LocalPlace } from "../model";

/** Load the localized gallery and business details for the opened place. */
export function usePlaceMedia(place: LocalPlace, language: DiscoveryLanguage) {
  const { id } = place;
  const enabled = hasPlaceMedia(place);
  const key = `${id}:${language}`;
  const [response, setResponse] = useState<{ key: string; data: PlaceMedia }>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void getPlaceMedia(id, "gallery", language).then(
      (data) => {
        if (active) setResponse({ key, data });
      },
      () => {
        if (active) setResponse({ key, data: { photoList: [] } });
      },
    );
    return () => {
      active = false;
    };
  }, [enabled, id, key, language]);
  return {
    media: response?.key === key ? response.data : undefined,
    pending: enabled && response?.key !== key,
  };
}
