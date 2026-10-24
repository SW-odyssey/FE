"use client";
import type { LocalPlace } from "../model";
export function Photo({
  place,
  className = "",
  eager = false,
}: {
  place: LocalPlace;
  className?: string;
  eager?: boolean;
}) {
  return (
    <img
      src={place.image}
      alt={place.koreanName}
      className={`local-photo ${className}`}
      loading={eager ? "eager" : "lazy"}
      data-place={place.id}
    />
  );
}
