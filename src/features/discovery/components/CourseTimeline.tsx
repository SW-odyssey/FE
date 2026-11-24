"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { distanceMeters } from "../../map/geometry";
import type { CourseLeg } from "../auto-course";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { areaLabels, slotLabels } from "../presentation";
import { Photo } from "./PlacePhoto";

type Row = CourseLeg & {
  id: string;
  index: number;
  distance?: number;
  exiting: boolean;
  entering?: boolean;
};

type Props = Pick<
  DiscoveryController,
  "language" | "name" | "openPlace" | "t"
> & {
  route: CourseLeg[];
  formatDistance: Intl.NumberFormat;
};

const rowTransitionMs = 240;

function courseRows(route: CourseLeg[]): Row[] {
  return route.map((leg, index) => ({
    ...leg,
    id: `${leg.slot}:${leg.place.category}`,
    index,
    distance:
      index > 0 ? distanceMeters(route[index - 1].place, leg.place) : undefined,
    exiting: false,
  }));
}

export function CourseTimeline({
  route,
  formatDistance,
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
        ({ id, slot, place, index, distance, exiting, entering }) => (
          <li
            key={id}
            inert={exiting}
            data-exiting={exiting ? "" : undefined}
            data-entering={entering ? "" : undefined}
            data-first={!exiting && index === 0 ? "" : undefined}
            data-last={!exiting && index === route.length - 1 ? "" : undefined}
          >
            <div className="local-course-timeline-item">
              {distance !== undefined && (
                <p className="local-course-distance">
                  {t("Straight line", "직선")} {formatDistance.format(distance)}
                </p>
              )}
              <div className="local-course-stop">
                <span className="local-course-pin" aria-hidden="true">
                  {index + 1}
                </span>
                <button
                  className="local-course-stop-detail"
                  onClick={() => openPlace(place)}
                >
                  <Photo place={place} decorative />
                  <span className="local-place-info">
                    <span className="local-auto-stage">
                      {place.category === "culture"
                        ? t("Browse shops", "구경")
                        : slot === "afternoon"
                          ? t("Café", "카페")
                          : slotLabels[language][slot]}
                    </span>
                    <strong>{name(place)}</strong>
                    <span>{areaLabels[language][place.area]}</span>
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
