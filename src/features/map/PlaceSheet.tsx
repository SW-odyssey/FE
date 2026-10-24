"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { localText } from "../discovery/localization";
import type { DiscoveryLanguage } from "../discovery/model";
import {
  resistSheetHeight,
  sheetHeights,
  sheetSnapTarget,
  stepSheetSpring,
  type SheetState,
} from "./sheet-motion";

type Drag = {
  id: number;
  y: number;
  height: number;
  state: SheetState;
  scale: number;
  moved: boolean;
  samples: { y: number; time: number }[];
};

export default function PlaceSheet({
  state,
  onStateChange,
  scale,
  language,
  summary,
  children,
}: {
  state: SheetState;
  onStateChange: (state: SheetState) => void;
  scale: number;
  language: DiscoveryLanguage;
  summary: ReactNode;
  children: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const [height, setHeight] = useState(sheetHeights[state]);
  const [dragging, setDragging] = useState(false);
  const motion = useRef({ height: sheetHeights[state], velocity: 0, frame: 0 });
  const drag = useRef<Drag | null>(null);
  const targetState = useRef(state);
  const suppressClick = useRef(false);
  const reducedMotion = useRef(false);
  const t = (en: string, ko: string) => localText(language, en, ko);

  const paint = useCallback((next: number) => {
    motion.current.height = next;
    setHeight(next);
  }, []);
  const stop = useCallback(() => {
    cancelAnimationFrame(motion.current.frame);
    motion.current.frame = 0;
  }, []);
  const settle = useCallback(
    (target: number, velocity = motion.current.velocity) => {
      stop();
      if (reducedMotion.current) {
        motion.current.velocity = 0;
        paint(target);
        return;
      }
      motion.current.velocity = Math.max(-2000, Math.min(2000, velocity));
      let previous = performance.now();
      const tick = (now: number) => {
        const next = stepSheetSpring(
          motion.current.height,
          motion.current.velocity,
          target,
          Math.min((now - previous) / 1000, 0.064),
        );
        previous = now;
        motion.current.velocity = next.velocity;
        if (
          Math.abs(next.position - target) < 0.35 &&
          Math.abs(next.velocity) < 5
        ) {
          motion.current.frame = 0;
          motion.current.velocity = 0;
          paint(target);
        } else {
          paint(next.position);
          motion.current.frame = requestAnimationFrame(tick);
        }
      };
      motion.current.frame = requestAnimationFrame(tick);
    },
    [paint, stop],
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      reducedMotion.current = media.matches;
      if (media.matches && motion.current.frame) {
        stop();
        motion.current.velocity = 0;
        paint(sheetHeights[targetState.current]);
      }
    };
    change();
    media.addEventListener("change", change);
    return () => {
      stop();
      media.removeEventListener("change", change);
    };
  }, [paint, stop]);
  useEffect(() => {
    if (targetState.current === state) return;
    targetState.current = state;
    drag.current = null;
    setDragging(false);
    settle(sheetHeights[state]);
  }, [state, settle]);
  useEffect(() => {
    if (!drag.current) return;
    drag.current = null;
    suppressClick.current = true;
    setDragging(false);
    settle(sheetHeights[targetState.current], 0);
  }, [scale, settle]);
  useLayoutEffect(() => {
    // The SDK attribution follows the same frame as the sheet; the map camera stays still.
    root.current?.parentElement?.style.setProperty(
      "--local-map-sheet-inset",
      `${height}px`,
    );
  }, [height]);

  function endDrag(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (!current.moved) {
      if (cancelled) settle(sheetHeights[current.state], 0);
      return;
    }
    suppressClick.current = true;
    const last = current.samples.at(-1)!;
    const first = current.samples[0];
    const elapsed = last.time - first.time;
    const velocity =
      !cancelled && event.timeStamp - last.time < 90 && elapsed > 0
        ? (first.y - last.y) / current.scale / elapsed
        : 0;
    const maximum = sheetHeights.expanded;
    const snap = cancelled
      ? sheetHeights[current.state]
      : sheetSnapTarget(
          motion.current.height,
          velocity,
          current.height,
          maximum,
        );
    const next =
      snap === sheetHeights.collapsed
        ? "collapsed"
        : snap === sheetHeights.half
          ? "half"
          : "expanded";
    targetState.current = next;
    onStateChange(next);
    settle(snap, velocity * 1000);
  }

  const listReveal = Math.max(0, Math.min(1, (height - 136) / 72));
  const summaryReveal = 1 - Math.max(0, Math.min(1, (height - 100) / 32));
  const listActive = listReveal > 0.5;
  return (
    <section
      ref={root}
      className={`local-place-sheet is-${state} ${dragging ? "is-dragging" : ""}`}
      style={
        {
          height,
          "--sheet-list-reveal": listReveal,
          "--sheet-summary-reveal": summaryReveal,
        } as CSSProperties
      }
      aria-label={t("Places on map", "지도 위 장소")}
      data-sheet-state={state}
      data-sheet-dragging={dragging}
    >
      <button
        className="local-sheet-handle"
        aria-label={t("Change sheet height", "시트 높이 변경")}
        aria-expanded={state !== "collapsed"}
        aria-controls="local-map-sheet-body"
        title={t(
          "Drag to resize · use up and down arrow keys",
          "끌어서 높이 변경 · 위아래 방향키로 조절",
        )}
        onClick={(event) => {
          if (suppressClick.current && event.detail !== 0) {
            suppressClick.current = false;
            return;
          }
          onStateChange(
            state === "collapsed"
              ? "half"
              : state === "half"
                ? "expanded"
                : "collapsed",
          );
        }}
        onKeyDown={(event) => {
          const next =
            event.key === "ArrowUp"
              ? state === "collapsed"
                ? "half"
                : "expanded"
              : event.key === "ArrowDown"
                ? state === "expanded"
                  ? "half"
                  : "collapsed"
                : event.key === "Home"
                  ? "collapsed"
                  : event.key === "End"
                    ? "expanded"
                    : null;
          if (next) {
            event.preventDefault();
            onStateChange(next);
          }
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          stop();
          motion.current.velocity = 0;
          suppressClick.current = false;
          drag.current = {
            id: event.pointerId,
            y: event.clientY,
            height: motion.current.height,
            state,
            scale,
            moved: false,
            samples: [{ y: event.clientY, time: event.timeStamp }],
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current || current.id !== event.pointerId) return;
          const delta = (current.y - event.clientY) / current.scale;
          if (!current.moved && Math.abs(delta) < 4) return;
          current.moved = true;
          setDragging(true);
          current.samples.push({ y: event.clientY, time: event.timeStamp });
          current.samples = current.samples.filter(
            (sample) => event.timeStamp - sample.time <= 100,
          );
          paint(
            resistSheetHeight(current.height + delta, sheetHeights.expanded),
          );
        }}
        onPointerUp={(event) => endDrag(event)}
        onPointerCancel={(event) => endDrag(event, true)}
        onLostPointerCapture={(event) => endDrag(event, true)}
      >
        <span />
      </button>
      <div id="local-map-sheet-body">
        <div
          className="local-sheet-summary-layer"
          inert={listActive}
          aria-hidden={listActive}
        >
          {summary}
        </div>
        <div
          className="local-sheet-list-layer"
          inert={!listActive}
          aria-hidden={!listActive}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
