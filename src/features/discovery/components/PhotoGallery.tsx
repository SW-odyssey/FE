"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { clampPhotoIndex, resolveGalleryIndex } from "../gallery-selection";
import { localText } from "../localization";
import type { DiscoveryLanguage, LocalPlace, PlacePhoto } from "../model";

export default function PhotoGallery({
  place,
  language,
  photos,
}: {
  place: LocalPlace;
  language: DiscoveryLanguage;
  photos: PlacePhoto[];
}) {
  const track = useRef<HTMLDivElement>(null);
  const sources = photos.map((photo) => photo.src);
  const collection = JSON.stringify(sources);
  const [selection, setSelection] = useState(() => ({
    sources,
    collection,
    index: 0,
  }));
  let currentIndex = selection.index;
  if (selection.collection !== collection) {
    currentIndex = resolveGalleryIndex(
      selection.index,
      selection.sources,
      sources,
    );
    setSelection({ sources, collection, index: currentIndex });
  }
  const previousCollection = useRef(collection);
  const currentPhoto = photos[currentIndex];
  useLayoutEffect(() => {
    if (previousCollection.current === collection) return;
    previousCollection.current = collection;
    track.current?.scrollTo({
      left: currentIndex * track.current.clientWidth,
      behavior: "instant",
    });
  }, [collection, currentIndex]);
  const t = (en: string, ko: string) => localText(language, en, ko);
  const kind = (photo: (typeof photos)[number]) =>
    photo.kind === "exterior"
      ? t("Exterior", "전경")
      : photo.kind === "interior"
        ? t("Interior", "실내")
        : t("Food and drinks", "음식 및 음료");
  function go(next: number) {
    const node = track.current;
    if (!node) return;
    node.scrollTo({
      left: clampPhotoIndex(next, photos.length) * node.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  if (!currentPhoto) {
    const emptyText = {
      en: "Photos unavailable",
      ko: "사진 정보가 없어요",
      ja: "写真情報がありません",
      zh: "暂无照片信息",
    }[language];
    return (
      <div
        className="local-detail-hero local-photo-gallery"
        role="region"
        aria-label={t("Place photos", "가게 사진")}
      >
        <div className="local-gallery-track" ref={track} role="status">
          <p>{emptyText}</p>
        </div>
      </div>
    );
  }
  return (
    <div
      className="local-detail-hero local-photo-gallery"
      role="region"
      aria-label={t("Place photos", "가게 사진")}
    >
      <div
        className="local-gallery-track"
        ref={track}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          go(currentIndex + (event.key === "ArrowLeft" ? -1 : 1));
        }}
        onScroll={(event) => {
          const node = event.currentTarget;
          const nextIndex = clampPhotoIndex(
            Math.round(node.scrollLeft / node.clientWidth),
            photos.length,
          );
          setSelection((previous) =>
            previous.index === nextIndex
              ? previous
              : { ...previous, index: nextIndex },
          );
        }}
      >
        {photos.map((photo, i) => (
          <img
            key={photo.src}
            src={photo.src}
            alt={`${language === "ko" ? place.koreanName : place.name} ${kind(photo)}`}
            className="local-photo"
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
          />
        ))}
      </div>
      <button
        className="local-gallery-arrow is-previous"
        disabled={currentIndex === 0}
        aria-label={t("Previous photo", "이전 사진")}
        onClick={() => go(currentIndex - 1)}
      >
        <span className="local-icon" />
      </button>
      <button
        className="local-gallery-arrow is-next"
        disabled={currentIndex === photos.length - 1}
        aria-label={t("Next photo", "다음 사진")}
        onClick={() => go(currentIndex + 1)}
      >
        <span className="local-icon" />
      </button>
      <span className="local-gallery-count" aria-live="polite">
        {kind(currentPhoto)}
        <span aria-hidden="true"> </span>
        {currentIndex + 1}/{photos.length}
      </span>
    </div>
  );
}
