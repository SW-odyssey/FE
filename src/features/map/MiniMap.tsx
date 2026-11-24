"use client";
import { useEffect, useRef, useState } from "react";
import type { DiscoveryLanguage, LocalPlace } from "../discovery/model";
import { createGoogleMiniMapSession } from "./google/session";
import { createMiniMapSession } from "./kakao/session";
import { attachPreferredMapSession, type MapProvider } from "./provider";
export default function MiniMap({
  place,
  language,
}: {
  place: LocalPlace;
  language: DiscoveryLanguage;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [provider, setProvider] = useState<MapProvider | null>(null);
  useEffect(
    () =>
      attachPreferredMapSession(
        language,
        {
          google: () => createGoogleMiniMapSession(ref.current!, place),
          kakao: () => createMiniMapSession(ref.current!, place),
        },
        (_session, vendor) => setProvider(vendor),
        () => setProvider(null),
      ),
    [place, language],
  );
  return (
    <div
      className="local-thumbnail-map"
      data-map-provider={provider ?? "preview"}
    >
      <div ref={ref} className="local-mini-map-canvas" />
      {!provider && (
        <div className="local-mini-map-fallback">
          <span className="local-mini-map-marker" />
        </div>
      )}
    </div>
  );
}
