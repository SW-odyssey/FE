"use client";

import { useEffect } from "react";

/*
 * Displacement map stretched over each glass surface: red moves pixels on x,
 * blue on y, and the blurred grey centre (128) leaves the middle undistorted,
 * so only the rim bends what is behind it.
 */
const DISPLACEMENT_MAP = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="none">
  <defs>
    <linearGradient id="x"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient>
    <linearGradient id="y" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#00f"/></linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <rect width="200" height="200" fill="url(#x)"/>
  <rect width="200" height="200" fill="url(#y)" style="mix-blend-mode:screen"/>
  <rect x="22" y="22" width="156" height="156" rx="18" fill="#808080" filter="url(#soft)"/>
</svg>`,
)}`;

/**
 * Renders the shared SVG refraction filter for floating glass surfaces and
 * marks the document when the browser can apply it.
 *
 * Only Chromium renders SVG filters inside `backdrop-filter`; WebKit and
 * Gecko keep the plain blur with the rim highlight from `liquid-glass.css`.
 *
 * @returns A hidden SVG holding the `#local-liquid` filter.
 */
export function LiquidGlassFilter() {
  useEffect(() => {
    const brands =
      (
        navigator as Navigator & {
          userAgentData?: { brands: { brand: string }[] };
        }
      ).userAgentData?.brands ?? [];
    if (!brands.some(({ brand }) => brand === "Chromium")) return;
    const root = document.documentElement;
    root.dataset.liquid = "refract";
    return () => {
      delete root.dataset.liquid;
    };
  }, []);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute" }}
    >
      {/* Bounding-box units stretch the map over each surface; scale is a share of its size. */}
      <filter
        id="local-liquid"
        x="0"
        y="0"
        width="1"
        height="1"
        primitiveUnits="objectBoundingBox"
        colorInterpolationFilters="sRGB"
      >
        <feImage
          href={DISPLACEMENT_MAP}
          x="0"
          y="0"
          width="1"
          height="1"
          preserveAspectRatio="none"
          result="map"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale="0.08"
          xChannelSelector="R"
          yChannelSelector="B"
        />
      </filter>
    </svg>
  );
}
