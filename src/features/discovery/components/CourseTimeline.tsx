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
  rebuild?: {
    previous: Row[];
    previousVersion: number;
    running: boolean;
  };
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
const rebuildExitMs = 105;
const rebuildEntryMs = 165;
const rebuildStaggerMs = 155;
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
        rows: courseRows(route),
        rebuild: {
          previous: previousRows,
          previousVersion: timeline.rebuildVersion,
          running: false,
        },
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
    const { rebuild, rows } = timeline;
    if (!rebuild && !rows.some(({ exiting }) => exiting)) return;
    const reducedMotion = matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const scroller =
      rebuild && !rebuild.running ? scrollOnRebuild?.current : null;
    const deadline = performance.now() + maximumScrollWaitMs;
    if (scroller && scroller.scrollTop > 2) {
      scroller.scrollTo({
        top: 0,
        behavior: reducedMotion ? "instant" : "smooth",
      });
    }
    const stepCount = rebuild
      ? new Set([...rows, ...rebuild.previous].map(({ position }) => position))
          .size
      : 0;
    let timer: number;
    const advance = () => {
      if (
        !reducedMotion &&
        scroller &&
        scroller.scrollTop > 2 &&
        performance.now() < deadline
      ) {
        timer = window.setTimeout(advance, 32);
        return;
      }
      setTimeline((current) => {
        if (current !== timeline) return current;
        if (rebuild && !reducedMotion && !rebuild.running && stepCount) {
          return { ...current, rebuild: { ...rebuild, running: true } };
        }
        return {
          ...current,
          rows: rows.filter(({ exiting }) => !exiting),
          rebuild: undefined,
        };
      });
    };
    const duration = rebuild
      ? rebuild.running
        ? Math.max(0, stepCount - 1) * rebuildStaggerMs +
          rebuildExitMs +
          rebuildEntryMs
        : 0
      : rowTransitionMs;
    timer = window.setTimeout(advance, reducedMotion ? 0 : duration + 16);
    return () => window.clearTimeout(timer);
  }, [timeline, scrollOnRebuild]);

  const { rebuild } = timeline;
  const displayedRows =
    rebuild && !rebuild.running ? rebuild.previous : timeline.rows;
  const oldByPosition = new Map(
    (rebuild?.running ? rebuild.previous : []).map((row) => [
      row.position,
      row,
    ]),
  );
  const newByPosition = new Map(
    displayedRows.map((row) => [row.position, row]),
  );
  const positions = rebuild?.running
    ? [...new Set([...oldByPosition.keys(), ...newByPosition.keys()])].sort(
        (a, b) => a - b,
      )
    : displayedRows.map(({ position }) => position);
  const lastStop = displayedRows.findLast(({ exiting }) => !exiting);
  function renderStop({
    index,
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
        {index > 0 && (
          <div className="local-course-stop-controls">
            <p className="local-course-distance">
              {`${t("Est. walk", "예상 도보")} ${walkMinutes}${t(" min", "분")} (${t("Straight line", "직선 거리")} ${formatDistance.format(distanceMeters)})`}
            </p>
            {!exiting && changeFromHere && (
              <button
                type="button"
                className="local-course-change-slot"
                disabled={pending || Boolean(rebuild)}
                onClick={() => changeSlot(slot)}
                aria-label={`${slotLabels[language][slot]} · ${t("Change from this time", "이 시간대부터 바꾸기")}`}
              >
                {t("Change from here", "여기부터 바꾸기")}
              </button>
            )}
          </div>
        )}
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
      data-rebuilding={rebuild ? "" : undefined}
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
      {positions.map((position, index) => {
        const previous = oldByPosition.get(position);
        const row = newByPosition.get(position);
        return (
          <li
            key={position}
            inert={row?.exiting || Boolean(rebuild && !rebuild.running)}
            data-exiting={row?.exiting ? "" : undefined}
            data-entering={row?.entering ? "" : undefined}
            data-first={row?.index === 0 && !row.exiting ? "" : undefined}
            data-last={row === lastStop ? "" : undefined}
            data-swap={previous && row ? "" : undefined}
            style={
              rebuild?.running
                ? ({ "--local-course-stop-index": index } as CSSProperties)
                : undefined
            }
          >
            {previous && (
              <div
                key={rebuild?.previousVersion}
                className="local-course-motion-layer"
                data-course-motion="out"
                inert
              >
                <div className="local-course-timeline-item">
                  {renderStop(previous)}
                </div>
              </div>
            )}
            {row && (
              <div
                key={
                  rebuild && !rebuild.running
                    ? rebuild.previousVersion
                    : timeline.rebuildVersion
                }
                className="local-course-motion-layer"
                data-course-motion={rebuild?.running ? "in" : undefined}
              >
                <div className="local-course-timeline-item">
                  {renderStop(row)}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
