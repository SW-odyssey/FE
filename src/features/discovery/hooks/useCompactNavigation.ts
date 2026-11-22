"use client";

import { type UIEvent, useRef, useState } from "react";
import type { DiscoveryView } from "../model";

export function useCompactNavigation(view: DiscoveryView) {
  const [compact, setCompact] = useState({
    discover: false,
    course: false,
    map: false,
  });
  const positions = useRef({
    discover: { top: 0, travel: 0 },
    course: { top: 0, travel: 0 },
    map: { top: 0, travel: 0 },
  });

  const scrollers: Record<DiscoveryView, string> = {
    discover: ".local-places",
    course: ".local-course",
    map: ".local-sheet-scroll",
  };

  function onScroll(event: UIEvent<HTMLElement>) {
    const scroller = event.target;
    if (
      !(scroller instanceof HTMLElement) ||
      !scroller.matches(scrollers[view])
    ) {
      return;
    }

    // Safari can report offsets beyond either edge during a rubber-band bounce.
    const maximum = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const top = Math.min(maximum, Math.max(0, scroller.scrollTop));
    const position = positions.current[view];
    const delta = top - position.top;
    position.top = top;

    if (top <= 4) {
      position.travel = 0;
      if (compact[view])
        setCompact((previous) => ({ ...previous, [view]: false }));
      return;
    }
    if (delta === 0) return;
    position.travel =
      Math.sign(delta) === Math.sign(position.travel)
        ? position.travel + delta
        : delta;

    if (!compact[view] && position.travel >= 20) {
      setCompact((previous) => ({ ...previous, [view]: true }));
    } else if (compact[view] && position.travel <= -12) {
      setCompact((previous) => ({ ...previous, [view]: false }));
    }
  }

  return { compact: compact[view], onScroll };
}
