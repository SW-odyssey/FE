"use client";
import type { LocalPlace } from "../model";
export function Photo({
  place,
  className = "",
  eager = false,
  decorative = false,
}: {
  place: Pick<LocalPlace, "image" | "id" | "koreanName">;
  className?: string;
  eager?: boolean;
  decorative?: boolean;
}) {
  return (
    <img
      src={place.image}
      alt={decorative ? "" : place.koreanName}
      className={`local-photo ${className}`}
      loading={eager ? "eager" : "lazy"}
      data-place={place.id}
    />
  );
}
