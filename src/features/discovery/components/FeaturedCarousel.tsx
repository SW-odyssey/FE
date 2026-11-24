"use client";
import {
  type PointerEvent,
  type TouchEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
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

type MouseDrag = {
  pointerId: number;
  x: number;
  y: number;
  scale: number;
  startScroll: number;
  startSlide: number;
  axis: "pending" | "horizontal" | "vertical";
};

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
  const mouseDrag = useRef<MouseDrag | null>(null);
  const ignorePointerClick = useRef(false);
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
      mouseDrag.current = null;
      delete node.dataset.dragging;
      delete node.dataset.mouseSettling;
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
    const changed = () => {
      const node = track.current;
      if (
        media.matches &&
        loopOffset &&
        node?.clientWidth &&
        !mouseDrag.current
      ) {
        delete node.dataset.mouseSettling;
        scrollToSlide(node, position.current.index + loopOffset, "instant");
      }
      setReduceMotion(media.matches);
    };
    const visibility = () => setHidden(document.hidden);
    changed();
    visibility();
    media.addEventListener("change", changed);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", changed);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [loopOffset]);
  function settleLoop(node: HTMLDivElement) {
    if (!loopOffset || node.dataset.dragging) return;
    const target = node.dataset.mouseSettling;
    if (target !== undefined) {
      if (Math.abs(node.scrollLeft - Number(target)) > 1) return;
      delete node.dataset.mouseSettling;
    }
    // At either end the copy and the real card fill the same viewport.
    if (node.scrollLeft <= 1) scrollToSlide(node, count, "instant");
    if (node.scrollLeft >= node.scrollWidth - node.clientWidth - 1)
      scrollToSlide(node, 1, "instant");
  }
  function scheduleLoopReset(node: HTMLDivElement) {
    if (!loopOffset || node.dataset.dragging || "onscrollend" in node) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => settleLoop(node), 140);
  }
  function endTouch(event: TouchEvent<HTMLDivElement>) {
    const active = event.touches.length > 0;
    setTouching(active);
    if (!active) scheduleLoopReset(event.currentTarget);
  }
  function startMouseDrag(event: PointerEvent<HTMLDivElement>) {
    ignorePointerClick.current = false;
    if (!loopOffset || event.pointerType !== "mouse" || event.button !== 0)
      return;
    const node = event.currentTarget;
    const width = node.getBoundingClientRect().width;
    if (!width) return;
    // Keep mouse drags from leaving keyboard focus on a card that scrolled away.
    event.preventDefault();
    if (settleTimer.current) clearTimeout(settleTimer.current);
    mouseDrag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scale: node.clientWidth / width,
      startScroll: node.scrollLeft,
      startSlide: slideAtScroll(node),
      axis: "pending",
    };
    // Capture on the pressed card so an ordinary click still opens it.
    const card = (event.target as Element).closest("button.local-featured");
    (card ?? node).setPointerCapture(event.pointerId);
  }
  function moveMouseDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = mouseDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const node = event.currentTarget;
    const delta = drag.x - event.clientX;
    if (drag.axis === "pending") {
      const vertical = Math.abs(event.clientY - drag.y);
      if (Math.max(Math.abs(delta), vertical) < 6) return;
      drag.axis = Math.abs(delta) > vertical ? "horizontal" : "vertical";
      ignorePointerClick.current = true;
      if (drag.axis === "horizontal") {
        drag.startScroll = node.scrollLeft;
        drag.startSlide = slideAtScroll(node);
        node.dataset.dragging = "true";
        delete node.dataset.mouseSettling;
      }
    }
    if (drag.axis === "horizontal") {
      const stride = slideOffset(node, 1);
      const offset = Math.max(-stride, Math.min(stride, delta * drag.scale));
      node.scrollLeft = drag.startScroll + offset;
    }
  }
  function finishMouseDrag(
    event: PointerEvent<HTMLDivElement>,
    commit = false,
  ) {
    const drag = mouseDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    mouseDrag.current = null;
    if (drag.axis !== "horizontal") return;
    const node = event.currentTarget;
    const distance = (drag.x - event.clientX) * drag.scale;
    const threshold = Math.min(72, node.clientWidth * 0.22);
    const step =
      commit && Math.abs(distance) >= threshold ? Math.sign(distance) : 0;
    const next = Math.max(0, Math.min(count + 1, drag.startSlide + step));
    const target = slideOffset(node, next);
    const instant = reduceMotion || Math.abs(node.scrollLeft - target) <= 1;
    // Keep snap disabled until the animation reaches the destination.
    // Otherwise the browser first snaps back to the previous card.
    node.dataset.mouseSettling = String(target);
    delete node.dataset.dragging;
    node.scrollTo({ left: target, behavior: instant ? "instant" : "smooth" });
    if (instant) settleLoop(node);
    else scheduleLoopReset(node);
  }
  function go(next: number, from = index, direction?: -1 | 1) {
    const node = track.current;
    if (!node || !loopOffset) return;
    delete node.dataset.mouseSettling;
    if (reduceMotion) {
      scrollToSlide(node, next + loopOffset, "instant");
      return;
    }
    const current = slideAtScroll(node);
    // Retarget from the live scroll offset. A wrap copy can still be on screen
    // when the user immediately changes direction.
    let destination = next + loopOffset;
    if (from === count - 1 && next === 0 && direction !== -1 && current !== 0)
      destination = count + 1;
    if (
      from === 0 &&
      next === count - 1 &&
      direction !== 1 &&
      current !== count + 1
    )
      destination = 0;
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
      if (!node?.clientWidth || mouseDrag.current) return;
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
      <Photo
        place={place}
        eager={eager}
        caption={(attribution) => (
          <>
            <span className="local-featured-copy">
              <strong>{name(place)}</strong>
              <span>
                <LocalIcon name="map-pin" size={13} />
                {place.area && `${areaLabels[language][place.area]} · `}
                {kind(place)}
              </span>
            </span>
            {attribution}
          </>
        )}
      />
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
        data-mouse-scroll={loopOffset > 0 || undefined}
        onDragStart={(event) => event.preventDefault()}
        onPointerDown={startMouseDrag}
        onPointerMove={moveMouseDrag}
        onPointerUp={(event) => finishMouseDrag(event, true)}
        onPointerCancel={(event) => finishMouseDrag(event)}
        onLostPointerCapture={(event) => finishMouseDrag(event)}
        onWheel={(event) => {
          delete event.currentTarget.dataset.mouseSettling;
        }}
        onClickCapture={(event) => {
          if (event.detail === 0 || !ignorePointerClick.current) return;
          ignorePointerClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onTouchStart={(event) => {
          delete event.currentTarget.dataset.mouseSettling;
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
