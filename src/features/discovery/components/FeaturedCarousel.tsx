"use client";
import {
  type TouchEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

function slideOffset(node: HTMLDivElement, index: number) {
  return (
    (node.children.item(index) as HTMLElement).offsetLeft -
    (node.firstElementChild as HTMLElement).offsetLeft
  );
}

function scrollToSlide(
  node: HTMLDivElement,
  index: number,
  behavior: ScrollBehavior,
) {
  node.scrollTo({ left: slideOffset(node, index), behavior });
}

function slideAtScroll(node: HTMLDivElement) {
  if (node.children.length < 2) return 0;
  const stride = slideOffset(node, 1);
  return stride > 0
    ? Math.max(
        0,
        Math.min(
          node.children.length - 1,
          Math.round(node.scrollLeft / stride),
        ),
      )
    : 0;
}

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
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = places.length;
  const loopOffset = count > 1 ? 1 : 0;
  const [initialIndex] = useState(() =>
    Math.max(
      0,
      places.findIndex((p) => p.id === featuredId),
    ),
  );
  const [index, setIndex] = useState(initialIndex);
  const position = useRef({ width: 0, index: initialIndex });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const copy = discoveryCopy[language];
  useLayoutEffect(() => {
    const node = track.current;
    if (!node) return;
    node.dataset.loopReady = "";
    position.current = { width: 0, index: Math.min(initialIndex, count - 1) };
    const align = () => {
      const width = node.clientWidth;
      if (!width || width === position.current.width) return;
      position.current.width = width;
      scrollToSlide(node, position.current.index + loopOffset, "instant");
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [count, initialIndex, loopOffset]);
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
  function settleLoop(node: HTMLDivElement) {
    if (!loopOffset) return;
    // At either end the copy and the real card fill the same viewport.
    if (node.scrollLeft <= 1) scrollToSlide(node, count, "instant");
    if (node.scrollLeft >= node.scrollWidth - node.clientWidth - 1)
      scrollToSlide(node, 1, "instant");
  }
  function scheduleLoopReset(node: HTMLDivElement) {
    if (!loopOffset || "onscrollend" in node) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => settleLoop(node), 140);
  }
  function endTouch(event: TouchEvent<HTMLDivElement>) {
    const active = event.touches.length > 0;
    setTouching(active);
    if (!active) scheduleLoopReset(event.currentTarget);
  }
  function go(next: number, from = index, direction?: -1 | 1) {
    const node = track.current;
    if (!node || !loopOffset || next === from) return;
    if (reduceMotion) {
      scrollToSlide(node, next + loopOffset, "instant");
      return;
    }
    const current = slideAtScroll(node);
    // Rapid key presses may target the focused card before its animation ends.
    if (current !== from + loopOffset)
      scrollToSlide(node, from + loopOffset, "instant");
    let destination = next + loopOffset;
    if (from === count - 1 && next === 0 && direction !== -1)
      destination = count + 1;
    if (from === 0 && next === count - 1 && direction !== 1) destination = 0;
    scrollToSlide(node, destination, "smooth");
  }
  useEffect(() => {
    if (
      !loopOffset ||
      hovered ||
      focused ||
      touching ||
      hidden ||
      reduceMotion ||
      modal
    )
      return;
    const timer = setTimeout(() => {
      const node = track.current;
      if (!node?.clientWidth) return;
      scrollToSlide(node, index + loopOffset + 1, "smooth");
    }, 6000);
    return () => clearTimeout(timer);
  }, [
    index,
    loopOffset,
    hovered,
    focused,
    touching,
    hidden,
    reduceMotion,
    modal,
  ]);

  if (!count) return null;

  function cardContent(place: LocalPlace, eager: boolean) {
    return (
      <>
        <Photo place={place} eager={eager} />
        <span className="local-featured-copy">
          <span>
            {areaLabels[language][place.area]} · {kind(place)}
          </span>
          <strong>{name(place)}</strong>
        </span>
      </>
    );
  }
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
        onTouchStart={() => {
          if (settleTimer.current) clearTimeout(settleTimer.current);
          setTouching(true);
        }}
        onTouchEnd={endTouch}
        onTouchCancel={endTouch}
        onScrollEnd={(event) => settleLoop(event.currentTarget)}
        onScroll={(event) => {
          const node = event.currentTarget;
          if (!node.clientWidth || node.clientWidth !== position.current.width)
            return;
          const next = (slideAtScroll(node) + count - loopOffset) % count;
          if (next !== position.current.index) {
            position.current.index = next;
            setIndex(next);
            setFeaturedId(places[next].id);
          }
          if (!touching) scheduleLoopReset(node);
        }}
      >
        {loopOffset > 0 && (
          <div className="local-featured is-loop-copy" aria-hidden="true">
            {cardContent(places[count - 1], true)}
          </div>
        )}
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
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const next = (i + direction + count) % count;
              go(next, i, direction);
              const slide = track.current?.children.item(next + loopOffset);
              if (slide instanceof HTMLElement)
                slide.focus({ preventScroll: true });
            }}
          >
            {cardContent(place, i === initialIndex)}
          </button>
        ))}
        {loopOffset > 0 && (
          <div className="local-featured is-loop-copy" aria-hidden="true">
            {cardContent(places[0], true)}
          </div>
        )}
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
