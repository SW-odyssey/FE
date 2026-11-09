"use client";
import { useEffect, useRef, useState } from "react";
import type { LocalPlace } from "../discovery/model";
import { attachMapSession } from "./controller";
import { createMiniMapSession, prepareKakaoMap } from "./kakao/session";
export default function MiniMap({ place }: { place: LocalPlace }) {
  const ref = useRef<HTMLDivElement>(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    return attachMapSession(
      prepareKakaoMap,
      () => createMiniMapSession(ref.current!, place),
      () => setReady(true),
      () => {},
    );
  }, [place]);
  return (
    <div className="local-thumbnail-map">
      <div ref={ref} className="local-mini-map-canvas" />
      {!ready && (
        <div className="local-mini-map-fallback">
          <span className="local-mini-map-marker" />
        </div>
      )}
    </div>
  );
}
