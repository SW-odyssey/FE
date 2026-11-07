"use client";

import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  index: number;
  width: number;
  bounds: DOMRectReadOnly;
  axis: "pending" | "horizontal" | "vertical";
};

type DragPreview = {
  position: number;
  lightX: string;
  lightY: string;
};

export function SegmentedChoice<Value extends string>({
  as: ElementType = "div",
  className,
  label,
  options,
  value,
  onChange,
}: {
  as?: "div" | "nav";
  className: string;
  label: string;
  options: readonly { value: Value; label: ReactNode }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const ignorePointerClick = useRef(false);
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const selected = options.findIndex((option) => option.value === value);
  const navigation = ElementType === "nav";
  const position = preview?.position ?? Math.max(0, selected);
  const style = {
    "--local-segment-count": options.length,
    "--local-segment-position": position,
    "--local-segment-light-x": preview?.lightX,
    "--local-segment-light-y": preview?.lightY,
  } as CSSProperties;

  function positionAt(drag: Gesture, x: number) {
    const position = drag.index + (x - drag.startX) / drag.width;
    return Math.max(0, Math.min(options.length - 1, position));
  }

  function start(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    const control = event.currentTarget;
    const button =
      event.target instanceof Element ? event.target.closest("button") : null;
    if (!button || button.parentElement !== control || !control.offsetWidth)
      return;
    const bounds = control.getBoundingClientRect();
    // Measure the segment before its press scale, in the viewport's pixels.
    const width = (button.offsetWidth / control.offsetWidth) * bounds.width;
    if (!width) return;
    ignorePointerClick.current = false;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      index: Number(button.dataset.segmentIndex),
      width,
      bounds,
      axis: "pending",
    };
    // Capturing on the button preserves its native click for taps.
    button.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.axis === "pending") {
      const x = Math.abs(event.clientX - drag.startX);
      const y = Math.abs(event.clientY - drag.startY);
      if (Math.max(x, y) < 6) return;
      drag.axis = x > y ? "horizontal" : "vertical";
      ignorePointerClick.current = true;
    }
    if (drag.axis === "horizontal") {
      const { left, top, width, height } = drag.bounds;
      const x = Math.max(0, Math.min(1, (event.clientX - left) / width));
      const y = Math.max(0, Math.min(1, (event.clientY - top) / height));
      setPreview({
        position: positionAt(drag, event.clientX),
        lightX: `${18 + x * 64}%`,
        lightY: `${-8 + y * 35}%`,
      });
    }
  }

  function finish(event: PointerEvent<HTMLElement>, commit = false) {
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
    <ElementType
      className={`${className} local-segment-control`}
      style={style}
      role={navigation ? undefined : "group"}
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
          aria-current={
            navigation && option.value === value ? "page" : undefined
          }
          aria-pressed={navigation ? undefined : option.value === value}
          data-segment-index={index}
          data-highlighted={index === Math.round(position) || undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </ElementType>
  );
}
