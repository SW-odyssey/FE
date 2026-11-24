"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { getPlaceMedia, hasPlaceMedia } from "../data/place-media";
import type { LocalPlace, PlacePhoto } from "../model";

export type SheetThumbnail = {
  photo: PlacePhoto | null | undefined;
  publish: (id: string, photo: PlacePhoto | null) => void;
};

/** Render a place image and pass any required attribution to its caption. */
export function Photo({
  place,
  className = "",
  eager = false,
  decorative = false,
  placeholderIcon = "map-pin",
  caption,
  thumbnail,
  loadThumbnail = true,
}: {
  place: Pick<LocalPlace, "image" | "id" | "koreanName" | "googlePlaceId">;
  className?: string;
  eager?: boolean;
  decorative?: boolean;
  placeholderIcon?: "map-pin" | "coffee" | "compass";
  caption?: (attribution: ReactNode) => ReactNode;
  thumbnail?: SheetThumbnail;
  loadThumbnail?: boolean;
}) {
  const frame = useRef<HTMLSpanElement>(null);
  const retried = useRef<string | null>(null);
  const { id } = place;
  const canRequest =
    loadThumbnail &&
    Boolean(caption || thumbnail) &&
    !place.image &&
    hasPlaceMedia(place);
  const [photo, setPhoto] = useState<{
    id: string;
    value: PlacePhoto | null;
  }>();
  const [failedSource, setFailedSource] = useState<string>();
  const current =
    thumbnail?.photo !== undefined
      ? thumbnail.photo
      : photo?.id === id
        ? photo.value
        : undefined;
  const received = current !== undefined;
  function showThumbnail(value: PlacePhoto | null) {
    if (thumbnail) thumbnail.publish(id, value);
    else setPhoto({ id, value });
  }
  const showReceivedThumbnail = useEffectEvent(showThumbnail);
  useEffect(() => {
    const element = frame.current;
    if (!canRequest || received || !element) return;
    let active = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      void getPlaceMedia(id, "thumbnail").then(
        ({ photoList }) => {
          if (active) showReceivedThumbnail(photoList[0] ?? null);
        },
        () => {},
      );
    });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [canRequest, id, received]);

  const src = place.image || current?.src;
  const alt = decorative ? "" : place.koreanName;
  const classes = `local-photo ${className}`;
  const showPhoto = Boolean(src && failedSource !== src);
  const credit =
    current && showPhoto
      ? [current.credit, ...(current.authors?.map(({ name }) => name) ?? [])]
          .filter(Boolean)
          .join(" · ")
      : undefined;
  const attribution = credit && (
    <span className="local-photo-credit" title={credit}>
      {credit}
    </span>
  );
  const onError = () => {
    setFailedSource(src);
    if (!current || retried.current === id) return;
    retried.current = id;
    void getPlaceMedia(id, "thumbnail").then(
      ({ photoList }) => showThumbnail(photoList[0] ?? null),
      () => {},
    );
  };

  return (
    <>
      {place.image && showPhoto ? (
        <img
          src={src}
          alt={alt}
          className={classes}
          loading={eager ? "eager" : "lazy"}
          data-place={id}
          onError={onError}
        />
      ) : (
        <span
          className={`${classes} local-live-photo`}
          ref={frame}
          data-place={id}
        >
          {showPhoto ? (
            <img src={src} alt={alt} decoding="async" onError={onError} />
          ) : (
            <LocalIcon name={placeholderIcon} size={21} />
          )}
        </span>
      )}
      {caption?.(attribution)}
    </>
  );
}
