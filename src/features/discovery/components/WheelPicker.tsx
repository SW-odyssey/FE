"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
export function Wheel({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: string[];
  value: number;
  onChange: (value: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialValue = useRef(value);
  useLayoutEffect(() => {
    ref.current?.scrollTo({
      top: initialValue.current * 44,
      behavior: "instant",
    });
  }, []);
  useEffect(() => {
    const wheel = ref.current;
    if (wheel && Math.abs(wheel.scrollTop - value * 44) > 1)
      wheel.scrollTo({
        top: value * 44,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [value]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div className="local-wheel-column">
      <span className="local-field-label">{label}</span>
      <div
        ref={ref}
        className="local-wheel"
        role="listbox"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(
              Math.max(
                0,
                Math.min(
                  items.length - 1,
                  value + (e.key === "ArrowDown" ? 1 : -1),
                ),
              ),
            );
          }
        }}
        onScroll={(e) => {
          const top = e.currentTarget.scrollTop;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(
            () =>
              onChange(
                Math.max(0, Math.min(items.length - 1, Math.round(top / 44))),
              ),
            110,
          );
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            role="option"
            aria-selected={i === value}
            className={i === value ? "is-selected" : ""}
            onClick={() => onChange(i)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
