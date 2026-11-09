"use client";

import { type UIEvent, useRef, useState } from "react";
import type { DiscoveryView } from "../model";

export function useCompactNavigation(view: DiscoveryView) {
  const [compact, setCompact] = useState({ discover: false, map: false });
  const positions = useRef({
    discover: { top: 0, travel: 0 },
    map: { top: 0, travel: 0 },
  });

  function onScroll(event: UIEvent<HTMLElement>) {
    const scroller = event.target;
    const selector = view === "map" ? ".local-sheet-scroll" : ".local-places";
    if (!(scroller instanceof HTMLElement) || !scroller.matches(selector)) {
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
