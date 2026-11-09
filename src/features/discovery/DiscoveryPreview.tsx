"use client";

import type { DiscoveryDataSource } from "./data";
import DiscoveryApp from "./DiscoveryApp";
import { usePreviewViewport } from "./hooks/usePreviewViewport";

export default function DiscoveryPreview({
  source,
}: {
  source?: DiscoveryDataSource;
} = {}) {
  const { stage, phoneScale, viewportReady } = usePreviewViewport();
  return (
    <div className="local-preview-stage" ref={stage}>
      <div
        className="local-phone-frame"
        style={{
          width: 413 * phoneScale,
          height: 872 * phoneScale,
          visibility: viewportReady ? "visible" : "hidden",
        }}
      >
        <DiscoveryApp source={source} previewScale={phoneScale} />
      </div>
    </div>
  );
}
