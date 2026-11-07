"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import type { LocalPlace } from "../model";
import { areaLabels } from "../presentation";
import { discoveryCopy } from "../recommendation-analysis";
import { Photo } from "./PlacePhoto";

type Props = Pick<
  DiscoveryController,
  | "language"
  | "kind"
  | "name"
  | "openPlace"
  | "featuredId"
  | "setFeaturedId"
  | "modal"
> & { places: LocalPlace[] };

export function FeaturedCarousel({
  places,
  language,
  kind,
  name,
  openPlace,
  featuredId,
  setFeaturedId,
  modal,
}: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [initialIndex] = useState(() =>
    Math.max(
      0,
      places.findIndex((p) => p.id === featuredId),
    ),
  );
  const [index, setIndex] = useState(initialIndex);
  const [interactionRevision, setInteractionRevision] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const copy = discoveryCopy[language];
  useLayoutEffect(() => {
    track.current?.scrollTo({
      left: initialIndex * track.current.clientWidth,
      behavior: "instant",
    });
  }, [initialIndex]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setReduceMotion(media.matches);
    const visibility = () => setHidden(document.hidden);
    changed();
    visibility();
    media.addEventListener("change", changed);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", changed);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  function go(next: number) {
    setInteractionRevision((value) => value + 1);
    track.current?.scrollTo({
      left: next * track.current.clientWidth,
      behavior: reduceMotion ? "instant" : "smooth",
    });
  }
  useEffect(() => {
    if (
      places.length < 2 ||
      hovered ||
      focused ||
      hidden ||
      reduceMotion ||
      modal
    )
      return;
    const timer = setInterval(() => {
      const node = track.current;
      if (!node?.clientWidth) return;
      const next =
        (Math.round(node.scrollLeft / node.clientWidth) + 1) % places.length;
      node.scrollTo({ left: next * node.clientWidth, behavior: "smooth" });
    }, 6000);
    return () => clearInterval(timer);
  }, [
    places.length,
    interactionRevision,
    hovered,
    focused,
    hidden,
    reduceMotion,
    modal,
  ]);
  return (
    <section
      className="local-featured-carousel"
      aria-roledescription="carousel"
      aria-label={copy.featured}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div
        className="local-featured-track"
        ref={track}
        onPointerDown={() => setInteractionRevision((value) => value + 1)}
        onScroll={(event) => {
          const node = event.currentTarget;
          if (!node.clientWidth) return;
          const next = Math.max(
            0,
            Math.min(
              places.length - 1,
              Math.round(node.scrollLeft / node.clientWidth),
            ),
          );
          setIndex(next);
          setFeaturedId(places[next].id);
        }}
      >
        {places.map((place, i) => (
          <button
            key={place.id}
            className="local-featured"
            onClick={() => openPlace(place)}
            aria-label={`${name(place)}, ${i + 1}/${places.length}`}
            tabIndex={index === i ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft")
                return;
              event.preventDefault();
              const offset = event.key === "ArrowRight" ? 1 : places.length - 1;
              const next = (i + offset) % places.length;
              go(next);
              const slide = track.current?.children.item(next);
              if (slide instanceof HTMLElement)
                slide.focus({ preventScroll: true });
            }}
          >
            <Photo place={place} eager={i === 0} />
            <span className="local-featured-copy">
              <span>
                {areaLabels[language][place.area]} · {kind(place)}
              </span>
              <strong>{name(place)}</strong>
            </span>
          </button>
        ))}
      </div>
      {places.length > 1 && (
        <div className="local-carousel-pagination">
          <div>
            {places.map((place, i) => (
              <button
                key={place.id}
                aria-label={`${name(place)}, ${i + 1}/${places.length}`}
                aria-current={index === i ? "true" : undefined}
                onClick={() => go(i)}
              >
                <span />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
