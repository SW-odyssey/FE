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
  "language" | "name" | "openPlace" | "t"
> & {
  route: CourseLeg[];
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
  pending,
  changeSlot,
  language,
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
                  {index === 0
                    ? t("From the start", "출발지에서")
                    : t("From the previous stop", "이전 장소에서")}{" "}
                  · {t("Est. walk", "예상 도보")} {walkMinutes}
                  {t(" min", "분")}
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
                    <span>
                      {place.courseKind === "shop"
                        ? t("Browse shops", "구경")
                        : place.courseKind === "play"
                          ? t("Activity", "놀거리")
                          : place.courseKind === "bar"
                            ? t("Bar", "주점")
                            : place.category === "cafe"
                              ? t("Café", "카페")
                              : t("Korean food", "한식")}
                    </span>
                  </span>
                  <LocalIcon name="chevron-right" size={16} />
                </button>
              </div>
            </div>
          </li>
        ),
      )}
    </ol>
  );
}
