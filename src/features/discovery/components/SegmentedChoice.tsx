"use client";

import { type CSSProperties, type PointerEvent, useRef, useState } from "react";

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  index: number;
  width: number;
  axis: "pending" | "horizontal" | "vertical";
};

export function SegmentedChoice<Value extends string>({
  className,
  label,
  options,
  value,
  onChange,
}: {
  className: string;
  label: string;
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const ignorePointerClick = useRef(false);
  const [preview, setPreview] = useState<number | null>(null);
  const selected = options.findIndex((option) => option.value === value);
  const position = preview ?? Math.max(0, selected);
  const style = {
    "--local-segment-count": options.length,
    "--local-segment-position": position,
  } as CSSProperties;

  function positionAt(drag: Gesture, x: number) {
    const position = drag.index + (x - drag.startX) / drag.width;
    return Math.max(0, Math.min(options.length - 1, position));
  }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    const button =
      event.target instanceof Element ? event.target.closest("button") : null;
    if (!button || button.parentElement !== event.currentTarget) return;
    const width = button.getBoundingClientRect().width;
    if (!width) return;
    ignorePointerClick.current = false;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      index: Number(button.dataset.segmentIndex),
      width,
      axis: "pending",
    };
    // Capturing on the button preserves its native click for taps.
    button.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.axis === "pending") {
      const x = Math.abs(event.clientX - drag.startX);
      const y = Math.abs(event.clientY - drag.startY);
      if (Math.max(x, y) < 6) return;
      drag.axis = x > y ? "horizontal" : "vertical";
      ignorePointerClick.current = true;
    }
    if (drag.axis === "horizontal") setPreview(positionAt(drag, event.clientX));
  }

  function finish(event: PointerEvent<HTMLDivElement>, commit = false) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    gesture.current = null;
    setPreview(null);
    if (commit && drag.axis === "horizontal") {
      const next = options[Math.round(positionAt(drag, event.clientX))];
      if (next.value !== value) onChange(next.value);
    }
  }

  return (
    <div
      className={`${className} local-segment-control`}
      style={style}
      role="group"
      aria-label={label}
      data-dragging={preview !== null || undefined}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event)}
      onLostPointerCapture={(event) => finish(event)}
      onClickCapture={(event) => {
        if (event.detail === 0 || !ignorePointerClick.current) return;
        ignorePointerClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          data-segment-index={index}
          data-highlighted={index === Math.round(position) || undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
