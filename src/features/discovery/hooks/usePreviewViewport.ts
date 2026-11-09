"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { fitPhoneScale } from "../preview-viewport";

/** 프리뷰를 사용 가능한 뷰포트 안에 맞추고 첫 측정 후 표시합니다. */
export function usePreviewViewport() {
  const stage = useRef<HTMLDivElement>(null);
  const [phoneScale, setPhoneScale] = useState(1);
  const [viewportReady, setViewportReady] = useState(false);

  useLayoutEffect(() => {
    const resize = () => {
      const viewport = stage.current;
      if (!viewport) return;
      const height = Math.min(
        window.innerHeight,
        window.visualViewport?.height ?? window.innerHeight,
      );
      viewport.style.setProperty("--local-preview-height", `${height}px`);
      setPhoneScale(fitPhoneScale(viewport.clientWidth, height));
      setViewportReady(true);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (stage.current) observer.observe(stage.current);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, []);

  return { stage, phoneScale, viewportReady };
}
