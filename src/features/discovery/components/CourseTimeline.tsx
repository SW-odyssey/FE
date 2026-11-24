"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { CourseLeg } from "../data/course-api";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import type { VisitSlot } from "../model";
import { slotLabels } from "../presentation";

type Row = CourseLeg & {
  id: string;
  index: number;
  exiting: boolean;
  entering?: boolean;
};

type Props = Pick<
  DiscoveryController,
  "language" | "kind" | "name" | "openPlace" | "t"
> & {
  route: CourseLeg[];
  formatDistance: Intl.NumberFormat;
  pending: boolean;
  changeSlot: (slot: VisitSlot) => void;
};

const rowTransitionMs = 240;

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
  changeSlot,
  language,
  kind,
  name,
  openPlace,
  t,
}: Props) {
  const [timeline, setTimeline] = useState(() => ({
    route,
    rows: courseRows(route),
  }));
  if (timeline.route !== route) {
    const prevIds = new Set(timeline.rows.map(({ id }) => id));
    const rows = courseRows(route).map((row) => ({
      ...row,
      entering: !prevIds.has(row.id),
    }));
    const nextIds = new Set(rows.map(({ id }) => id));
    timeline.rows.forEach((row, index) => {
      if (!nextIds.has(row.id))
        rows.splice(index, 0, { ...row, entering: false, exiting: true });
    });
    setTimeline({ route, rows });
  }

  useEffect(() => {
    if (!timeline.rows.some(({ exiting }) => exiting)) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () =>
        setTimeline((current) => ({
          ...current,
          rows: current.rows.filter(({ exiting }) => !exiting),
        })),
      reducedMotion ? 0 : rowTransitionMs + 32,
    );
    return () => window.clearTimeout(timer);
  }, [timeline]);

  return (
    <ol
      className="local-course-timeline"
      aria-label={t("Visit order", "방문 순서")}
      style={
        {
          "--local-course-row-duration": `${rowTransitionMs}ms`,
        } as CSSProperties
      }
    >
      {timeline.rows.map(
        ({
          id,
          slot,
          place,
          position,
          index,
          visitTime,
          leaveTime,
          walkMinutes,
          hoursUnknown,
          distanceMeters,
          exiting,
          entering,
        }) => (
          <li
            key={id}
            inert={exiting}
            data-exiting={exiting ? "" : undefined}
            data-entering={entering ? "" : undefined}
            data-first={!exiting && index === 0 ? "" : undefined}
            data-last={!exiting && index === route.length - 1 ? "" : undefined}
          >
            <div className="local-course-timeline-item">
              <div className="local-course-stop-controls">
                <p className="local-course-distance">
                  {`${t("Est. walk", "예상 도보")} ${walkMinutes}${t(" min", "분")} (${t("Straight line", "직선 거리")} ${formatDistance.format(distanceMeters)})`}
                </p>
                {route[index - 1]?.slot !== slot && (
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
                  <span
                    className="local-photo local-course-stop-placeholder"
                    aria-hidden="true"
                  >
                    <LocalIcon
                      name={
                        place.category === "cafe"
                          ? "coffee"
                          : place.category === "culture"
                            ? "compass"
                            : "map-pin"
                      }
                      size={21}
                    />
                  </span>
                  <span className="local-place-info">
                    <span className="local-auto-stage">
                      {slotLabels[language][slot]} · {visitTime}–{leaveTime}
                    </span>
                    <strong>{name(place)}</strong>
                    <span>{kind(place)}</span>
                  </span>
                  <LocalIcon name="chevron-right" size={16} />
                </button>
              </div>
              {hoursUnknown && (
                <p className="local-course-hours">
                  {t("Check opening hours", "영업시간 확인 필요")}
                </p>
              )}
            </div>
          </li>
        ),
      )}
    </ol>
  );
}
