"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { CourseLeg } from "../data/course-api";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import type { VisitSlot } from "../model";
import { slotLabels } from "../presentation";
import { Photo } from "./PlacePhoto";

type Row = CourseLeg & {
  id: string;
  index: number;
  exiting: boolean;
  entering?: boolean;
  reveal?: "incoming" | "settling";
  previous?: CourseLeg;
};

type Props = Pick<
  DiscoveryController,
  "language" | "kind" | "name" | "openPlace" | "t"
> & {
  route: CourseLeg[];
  formatDistance: Intl.NumberFormat;
  pending: boolean;
  rebuildVersion: number;
  changeSlot: (slot: VisitSlot) => void;
};

const rowTransitionMs = 240;
const rebuildTransitionMs = 300;
const rebuildStaggerMs = 65;

function courseRows(route: CourseLeg[]): Row[] {
  return route.map((leg, index) => ({
    ...leg,
    id: String(leg.position),
    index,
    exiting: false,
  }));
}

export function CourseTimeline({
  route,
  formatDistance,
  pending,
  rebuildVersion,
  changeSlot,
  language,
  kind,
  name,
  openPlace,
  t,
}: Props) {
  const [timeline, setTimeline] = useState(() => ({
    route,
    rebuildVersion,
    rows: courseRows(route),
  }));
  if (timeline.route !== route) {
    const rebuilt =
      rebuildVersion > 0 && rebuildVersion !== timeline.rebuildVersion;
    const previousRows = new Map(
      timeline.rows.filter((row) => !row.exiting).map((row) => [row.id, row]),
    );
    const rows = courseRows(route).map((row) => {
      const previous = previousRows.get(row.id);
      const reveal = rebuilt
        ? previous?.place.id === row.place.id
          ? ("settling" as const)
          : ("incoming" as const)
        : undefined;
      return {
        ...row,
        entering: !rebuilt && !previous,
        reveal,
        previous: reveal === "incoming" ? previous : undefined,
      };
    });
    const nextIds = new Set(rows.map(({ id }) => id));
    timeline.rows.forEach((row, index) => {
      if (!nextIds.has(row.id))
        rows.splice(index, 0, {
          ...row,
          entering: false,
          exiting: true,
          reveal: undefined,
          previous: undefined,
        });
    });
    setTimeline({ route, rebuildVersion, rows });
  }

  useEffect(() => {
    const lastReveal = timeline.rows.findLast((row) => row.reveal);
    if (!lastReveal && !timeline.rows.some(({ exiting }) => exiting)) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () =>
        setTimeline((current) => ({
          ...current,
          rows: current.rows
            .filter(({ exiting }) => !exiting)
            .map((row) => ({ ...row, reveal: undefined, previous: undefined })),
        })),
      reducedMotion
        ? 0
        : (lastReveal
            ? rebuildTransitionMs + lastReveal.index * rebuildStaggerMs
            : rowTransitionMs) + 32,
    );
    return () => window.clearTimeout(timer);
  }, [timeline]);

  function renderStop(
    {
      slot,
      place,
      position,
      walkMinutes,
      hoursUnknown,
      distanceMeters,
    }: CourseLeg,
    index: number,
    exiting: boolean,
    motion?: Row["reveal"] | "outgoing",
  ) {
    return (
      <div
        key={place.id}
        className="local-course-row-content"
        data-rebuild-motion={motion}
        inert={motion === "outgoing"}
        aria-hidden={motion === "outgoing" || undefined}
      >
        <div className="local-course-stop-controls">
          <p className="local-course-distance">
            {`${t("Est. walk", "예상 도보")} ${walkMinutes}${t(" min", "분")} (${t("Straight line", "직선 거리")} ${formatDistance.format(distanceMeters)})`}
          </p>
          {!exiting && index > 0 && route[index - 1]?.slot !== slot && (
            <button
              type="button"
              className="local-course-change-slot"
              disabled={pending}
              onClick={() => changeSlot(slot)}
              aria-label={`${slotLabels[language][slot]} · ${t("Change from this time", "이 시간대부터 바꾸기")}`}
            >
              {t("Change from here", "여기부터 바꾸기")}
            </button>
          )}
        </div>
        <div className="local-course-stop">
          <span className="local-course-pin" aria-hidden="true">
            {position}
          </span>
          <button
            className="local-course-stop-detail"
            onClick={() => openPlace(place)}
          >
            <Photo
              place={place}
              decorative
              placeholderIcon={
                place.category === "cafe"
                  ? "coffee"
                  : place.category === "culture"
                    ? "compass"
                    : "map-pin"
              }
              caption={(attribution) => (
                <span className="local-place-info">
                  <span className="local-auto-stage">
                    {slot === "evening" && place.category === "food"
                      ? t("Dinner", "저녁 식사")
                      : slotLabels[language][slot]}
                  </span>
                  <strong>{name(place)}</strong>
                  <span className="local-course-stop-meta">
                    <span>{kind(place)}</span>
                    {hoursUnknown && (
                      <span className="local-course-hours">
                        {t("Check opening hours", "영업시간 확인 필요")}
                      </span>
                    )}
                  </span>
                  {attribution}
                </span>
              )}
            />
            <LocalIcon name="chevron-right" size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <ol
      className="local-course-timeline"
      aria-label={t("Visit order", "방문 순서")}
      style={
        {
          "--local-course-row-duration": `${rowTransitionMs}ms`,
          "--local-course-rebuild-duration": `${rebuildTransitionMs}ms`,
        } as CSSProperties
      }
    >
      {timeline.rows.map((row) => (
        <li
          key={row.id}
          inert={row.exiting}
          data-exiting={row.exiting ? "" : undefined}
          data-entering={row.entering ? "" : undefined}
          data-first={!row.exiting && row.index === 0 ? "" : undefined}
          data-last={
            !row.exiting && row.index === route.length - 1 ? "" : undefined
          }
        >
          <div
            className="local-course-timeline-item"
            style={
              row.reveal
                ? ({
                    "--local-course-rebuild-delay": `${row.index * rebuildStaggerMs}ms`,
                  } as CSSProperties)
                : undefined
            }
          >
            {row.previous &&
              renderStop(row.previous, row.index, false, "outgoing")}
            {renderStop(row, row.index, row.exiting, row.reveal)}
          </div>
        </li>
      ))}
    </ol>
  );
}
