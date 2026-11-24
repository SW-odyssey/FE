"use client";

import { useEffect, useRef, useState } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { getPlaceMedia, hasPlaceMedia } from "../data/place-media";
import type { LocalPlace, PlacePhoto } from "../model";

export function Photo({
  place,
  className = "",
  eager = false,
  decorative = false,
  placeholderIcon = "map-pin",
}: {
  place: Pick<LocalPlace, "image" | "id" | "koreanName" | "googlePlaceId">;
  className?: string;
  eager?: boolean;
  decorative?: boolean;
  placeholderIcon?: "map-pin" | "coffee" | "compass";
}) {
  const frame = useRef<HTMLSpanElement>(null);
  const { id } = place;
  const canRequest = !place.image && hasPlaceMedia(place);
  const [photo, setPhoto] = useState<{ id: string; value?: PlacePhoto }>();
  const [failedSource, setFailedSource] = useState<string>();
  useEffect(() => {
    const element = frame.current;
    if (!canRequest || !element) return;
    let active = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      void getPlaceMedia(id, "thumbnail").then(
        ({ photoList }) => {
          if (active) setPhoto({ id, value: photoList[0] });
        },
        () => {
          if (active) setPhoto({ id });
        },
      );
    });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [canRequest, id]);

  const current = photo?.id === id ? photo.value : undefined;
  const src = place.image || current?.src;
  const alt = decorative ? "" : place.koreanName;
  const classes = `local-photo ${className}`;
  if (place.image && src && failedSource !== src) {
    return (
      <img
        src={src}
        alt={alt}
        className={classes}
        loading={eager ? "eager" : "lazy"}
        data-place={id}
        onError={() => setFailedSource(src)}
      />
    );
  }
  const credit =
    current &&
    [current.credit, ...(current.authors?.map(({ name }) => name) ?? [])]
      .filter(Boolean)
      .join(" · ");

  return (
    <span className={`${classes} local-live-photo`} ref={frame} data-place={id}>
      {src && failedSource !== src ? (
        <>
          <img
            src={src}
            alt={alt}
            decoding="async"
            onError={() => setFailedSource(src)}
          />
          {credit && (
            <span className="local-photo-credit" title={credit}>
              {credit}
            </span>
          )}
        </>
      ) : (
        <LocalIcon name={placeholderIcon} size={21} />
      )}
    </span>
  );
}
