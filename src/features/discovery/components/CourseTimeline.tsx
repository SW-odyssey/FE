"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { CourseLeg } from "../data/course-api";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import type { VisitSlot } from "../model";
import { slotLabels } from "../presentation";
import { Photo } from "./PlacePhoto";

type Row = CourseLeg & {
  id: string;
  index: number;
  changeFromHere: boolean;
  exiting: boolean;
  entering?: boolean;
};

type Timeline = {
  route: CourseLeg[];
  rebuildVersion: number;
  rows: Row[];
  rebuildPhase?: "leaving" | "arriving";
};

type Props = Pick<
  DiscoveryController,
  "language" | "kind" | "name" | "openPlace" | "t"
> & {
  route: CourseLeg[];
  formatDistance: Intl.NumberFormat;
  pending: boolean;
  rebuildVersion: number;
  scrollOnRebuild?: RefObject<HTMLDivElement | null>;
  changeSlot: (slot: VisitSlot) => void;
};

const rowTransitionMs = 240;
const rebuildExitMs = 140;
const rebuildEntryMs = 200;
const rebuildStaggerMs = 76;
const maximumScrollWaitMs = 520;

function courseRows(route: CourseLeg[]): Row[] {
  return route.map((leg, index) => ({
    ...leg,
    id: String(leg.position),
    index,
    changeFromHere: index > 0 && route[index - 1].slot !== leg.slot,
    exiting: false,
  }));
}

export function CourseTimeline({
  route,
  formatDistance,
  pending,
  rebuildVersion,
  scrollOnRebuild,
  changeSlot,
  language,
  kind,
  name,
  openPlace,
  t,
}: Props) {
  const [timeline, setTimeline] = useState<Timeline>(() => ({
    route,
    rebuildVersion,
    rows: courseRows(route),
  }));
  if (timeline.route !== route) {
    const rebuilt =
      rebuildVersion > 0 && rebuildVersion !== timeline.rebuildVersion;
    const previousRows = timeline.rows.filter((row) => !row.exiting);
    if (rebuilt) {
      setTimeline({
        route,
        rebuildVersion,
        rows: previousRows.length ? previousRows : courseRows(route),
        rebuildPhase: previousRows.length ? "leaving" : "arriving",
      });
    } else {
      const previousIds = new Set(previousRows.map(({ id }) => id));
      const rows = courseRows(route).map((row) => ({
        ...row,
        entering: !previousIds.has(row.id),
      }));
      const nextIds = new Set(rows.map(({ id }) => id));
      timeline.rows.forEach((row, index) => {
        if (!nextIds.has(row.id))
          rows.splice(index, 0, { ...row, entering: false, exiting: true });
      });
      setTimeline({ route, rebuildVersion, rows });
    }
  }

  useEffect(() => {
    const { rebuildPhase, rows, route } = timeline;
    if (!rebuildPhase && !rows.some(({ exiting }) => exiting)) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const scroller =
      rebuildPhase === "leaving" ? scrollOnRebuild?.current : null;
    const startedAt = performance.now();
    scroller?.scrollTo({
      top: 0,
      behavior: reducedMotion ? "instant" : "smooth",
    });
    const duration =
      rebuildPhase === "leaving"
        ? rebuildExitMs
        : rebuildPhase === "arriving"
          ? rebuildEntryMs + Math.max(rows.length - 1, 0) * rebuildStaggerMs
          : rowTransitionMs;
    let timer: number;
    const advance = () => {
      if (
        !reducedMotion &&
        scroller &&
        scroller.scrollTop > 2 &&
        performance.now() - startedAt < maximumScrollWaitMs
      ) {
        timer = window.setTimeout(advance, 32);
        return;
      }
      setTimeline((current) => {
        if (current !== timeline) return current;
        if (rebuildPhase === "leaving") {
          return {
            ...current,
            rows: courseRows(route),
            rebuildPhase: reducedMotion ? undefined : "arriving",
          };
        }
        return {
          ...current,
          rows: rows.filter(({ exiting }) => !exiting),
          rebuildPhase: undefined,
        };
      });
    };
    timer = window.setTimeout(advance, reducedMotion ? 0 : duration + 16);
    return () => window.clearTimeout(timer);
  }, [timeline, scrollOnRebuild]);

  const lastStop = timeline.rows.findLast(({ exiting }) => !exiting);
  function renderStop({
    slot,
    place,
    position,
    walkMinutes,
    hoursUnknown,
    distanceMeters,
    changeFromHere,
    exiting,
  }: Row) {
    return (
      <div key={place.id} className="local-course-row-content">
        <div className="local-course-stop-controls">
          <p className="local-course-distance">
            {`${t("Est. walk", "예상 도보")} ${walkMinutes}${t(" min", "분")} (${t("Straight line", "직선 거리")} ${formatDistance.format(distanceMeters)})`}
          </p>
          {!exiting && changeFromHere && (
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
                  <span className="local-course-photo-credit">
                    {attribution}
                  </span>
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
      data-rebuild-phase={timeline.rebuildPhase}
      aria-label={t("Visit order", "방문 순서")}
      style={
        {
          "--local-course-row-duration": `${rowTransitionMs}ms`,
          "--local-course-rebuild-exit": `${rebuildExitMs}ms`,
          "--local-course-rebuild-entry": `${rebuildEntryMs}ms`,
          "--local-course-rebuild-stagger": `${rebuildStaggerMs}ms`,
        } as CSSProperties
      }
    >
      {timeline.rows.map((row) => (
        <li
          key={row.id}
          inert={row.exiting || timeline.rebuildPhase === "leaving"}
          data-exiting={row.exiting ? "" : undefined}
          data-entering={row.entering ? "" : undefined}
          data-first={!row.exiting && row.index === 0 ? "" : undefined}
          data-last={row === lastStop ? "" : undefined}
        >
          <div
            className="local-course-timeline-item"
            style={{ "--local-course-stop-index": row.index } as CSSProperties}
          >
            {renderStop(row)}
          </div>
        </li>
      ))}
    </ol>
  );
}
