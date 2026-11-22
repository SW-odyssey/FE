"use client";

import { useState } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { distanceMeters } from "../../map/geometry";
import { courseCandidates } from "../course";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import type { useDeviceLocation } from "../../map/useDeviceLocation";
import { dateLocales, placeCount } from "../localization";
import { areaLabels } from "../presentation";
import { AutoCourse } from "./AutoCourse";
import { Photo } from "./PlacePhoto";
import { renderPlaceRow } from "./PlaceRow";
import { ResourceNotice } from "./ResourceNotice";
import { SegmentedChoice } from "./SegmentedChoice";

type Props = Pick<
  DiscoveryController,
  | "course"
  | "kind"
  | "language"
  | "mapId"
  | "name"
  | "navigate"
  | "openPlace"
  | "retry"
  | "scroll"
  | "status"
  | "t"
  | "view"
  | "visible"
> &
  React.ComponentProps<typeof AutoCourse> &
  Pick<DiscoveryController, "courseMode" | "setCourseMode"> & {
    location: ReturnType<typeof useDeviceLocation>;
  };

export function CourseScreen(props: Props) {
  const { courseMode, setCourseMode, scroll, t } = props;
  return (
    <div className="local-content local-course" ref={scroll}>
      <SegmentedChoice
        className="local-course-modes"
        label={t("Course", "코스")}
        value={courseMode}
        onChange={setCourseMode}
        options={[
          { value: "auto", label: t("Recommended course", "추천 코스") },
          { value: "saved", label: t("My course", "내 코스") },
        ]}
      />
      {courseMode === "auto" ? (
        <AutoCourse {...props} />
      ) : (
        <SavedCourse {...props} />
      )}
    </div>
  );
}

function SavedCourse(props: Props) {
  const {
    course: { stops, move, remove },
    kind,
    language,
    name,
    navigate,
    openPlace,
    retry,
    status,
    desktop,
    showCourseOnMap,
    t,
    visible,
  } = props;
  const [editing, setEditing] = useState(false);
  const candidates = courseCandidates(visible, stops);
  const last = stops.at(-1);
  const active = stops.length > 0;
  const formatDistance = new Intl.NumberFormat(dateLocales[language], {
    style: "unit",
    unit: "meter",
    maximumFractionDigits: 0,
  });

  return (
    <>
      <header className="local-course-heading">
        <h1>{t("My course", "내 코스")}</h1>
        {active && <p>{placeCount(language, stops.length)}</p>}
      </header>

      {active && (
        <section className="local-course-itinerary">
          <div className="local-course-section-heading">
            <h2>{t("Visit order", "방문 순서")}</h2>
            <button
              className="local-course-text-action"
              onClick={() => setEditing(!editing)}
            >
              {editing ? t("Done", "완료") : t("Edit order", "순서 편집")}
            </button>
          </div>
          <ol className="local-course-timeline">
            {stops.map((stop, index) => {
              const previous = stops[index - 1];
              const label = name(stop);
              return (
                <li key={stop.id}>
                  {previous && (
                    <p className="local-course-distance">
                      {t("Straight line", "직선")}{" "}
                      {formatDistance.format(distanceMeters(previous, stop))}
                    </p>
                  )}
                  <div className="local-course-stop">
                    <span className="local-course-pin" aria-hidden="true">
                      {index + 1}
                    </span>
                    <button
                      className="local-course-stop-detail"
                      onClick={() => openPlace(stop)}
                    >
                      <Photo place={stop} />
                      <span className="local-place-info">
                        <strong>{label}</strong>
                        <span>
                          {kind(stop)}, {areaLabels[language][stop.area]}
                        </span>
                      </span>
                      <LocalIcon name="chevron-right" size={16} />
                    </button>
                  </div>
                  {editing && (
                    <div
                      className="local-course-edit"
                      role="group"
                      aria-label={label}
                    >
                      <button
                        disabled={index === 0}
                        onClick={() => move(stop.id, -1)}
                        aria-label={`${label} · ${t("Move up", "위로 이동")}`}
                      >
                        <LocalIcon name="chevron-right" size={16} />
                      </button>
                      <button
                        disabled={index === stops.length - 1}
                        onClick={() => move(stop.id, 1)}
                        aria-label={`${label} · ${t("Move down", "아래로 이동")}`}
                      >
                        <LocalIcon name="chevron-right" size={16} />
                      </button>
                      <button
                        onClick={() => {
                          remove(stop.id);
                          if (stops.length === 1) {
                            setEditing(false);
                          }
                        }}
                        aria-label={`${label} · ${t("Remove", "삭제")}`}
                      >
                        <LocalIcon name="x" size={16} />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {!desktop && (
            <button
              className="local-course-map-toggle"
              onClick={showCourseOnMap}
            >
              <LocalIcon name="map" size={18} />
              {t("Course map", "코스 지도")}
              <LocalIcon name="chevron-right" size={16} />
            </button>
          )}
        </section>
      )}

      <section className="local-course-candidates">
        <div className="local-course-section-heading">
          <h2>
            {active
              ? t("Pick your next stop", "다음 장소 고르기")
              : t("Pick your first stop", "첫 장소 고르기")}
          </h2>
        </div>
        {last && (
          <p className="local-course-origin">
            <LocalIcon name="map-pin" size={14} />
            {t("Near {place}", "{place} 주변").replace("{place}", name(last))}
          </p>
        )}
        {status === "loading" || status === "error" ? (
          <ResourceNotice status={status} retry={retry} t={t} />
        ) : candidates.length ? (
          <div className="local-place-list">
            {candidates.map((p) => renderPlaceRow(props, p))}
          </div>
        ) : (
          <p className="local-course-empty">
            {t("No more recommendations", "추천할 다른 장소가 없어요")}
          </p>
        )}
        <button
          className="local-secondary"
          onClick={() => navigate("discover")}
        >
          <LocalIcon name="search" size={17} />
          {t("Browse places", "장소 둘러보기")}
        </button>
      </section>
    </>
  );
}
