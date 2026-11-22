"use client";

import { useRef, useState } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { distanceMeters } from "../../map/geometry";
import type { useDeviceLocation } from "../../map/useDeviceLocation";
import { autoCourseAlternatives } from "../auto-course";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { dateLocales } from "../localization";
import type { VisitSlot } from "../model";
import { areaLabels, slotLabels } from "../presentation";
import { visitDate } from "../visit-date";
import { Photo } from "./PlacePhoto";
import { ResourceNotice } from "./ResourceNotice";

type Props = Pick<
  DiscoveryController,
  | "autoCourse"
  | "clock"
  | "contextAreaLabel"
  | "currentArea"
  | "kind"
  | "language"
  | "name"
  | "openPlace"
  | "openTime"
  | "courseDate"
  | "courseTimeLabel"
  | "setModal"
  | "showCourseOnMap"
  | "t"
> & { location: ReturnType<typeof useDeviceLocation>; desktop: boolean };

export function AutoCourse({
  autoCourse,
  clock,
  contextAreaLabel,
  currentArea,
  kind,
  language,
  location,
  name,
  openPlace,
  openTime,
  courseDate,
  courseTimeLabel,
  setModal,
  showCourseOnMap,
  desktop,
  t,
}: Props) {
  const [replacing, setReplacing] = useState<VisitSlot | null>(null);
  const swapTrigger = useRef<HTMLButtonElement | null>(null);
  const { route, pools, origin } = autoCourse;
  const hero = (route.find((leg) => leg.slot === "afternoon") ?? route[0])
    ?.place;
  const title =
    courseDate === visitDate(clock, 0)
      ? t("Today's course", "오늘의 코스")
      : t("Recommended course", "추천 코스");
  const formatDistance = new Intl.NumberFormat(dateLocales[language], {
    style: "unit",
    unit: "meter",
    maximumFractionDigits: 0,
  });
  const stageLabel = (slot: VisitSlot, browse: boolean) =>
    browse
      ? t("Browse shops", "구경")
      : slot === "afternoon"
        ? t("Café", "카페")
        : slotLabels[language][slot];
  const change = (apply: () => void) => {
    setReplacing(null);
    swapTrigger.current = null;
    apply();
  };
  const closeAlternatives = () => {
    setReplacing(null);
    swapTrigger.current?.focus({ preventScroll: true });
    swapTrigger.current = null;
  };

  return (
    <>
      <header className={`local-auto-hero ${hero ? "has-photo" : ""}`}>
        {hero && (
          <Photo
            key={hero.id}
            place={hero}
            eager
            decorative
            className="local-auto-cover"
          />
        )}
        <div className="local-auto-hero-copy">
          <h1>{title}</h1>
          {route.length > 0 && (
            <p>
              {route
                .map(({ slot, place }) =>
                  stageLabel(slot, place.category === "culture"),
                )
                .join(" · ")}
            </p>
          )}
        </div>
      </header>
      <div className="local-auto-options">
        <div className="local-auto-context">
          <button
            onClick={() => setModal("area")}
            aria-label={t("Choose area", "지역 선택")}
          >
            <LocalIcon name="map-pin" size={15} />
            {origin ? t("My location", "내 위치") : contextAreaLabel}
            <LocalIcon name="chevron-right" size={12} />
          </button>
          <button
            onClick={() => openTime()}
            aria-label={t("Choose visit time", "방문 시간 선택")}
          >
            <LocalIcon name="clock" size={15} />
            {courseTimeLabel}
            <LocalIcon name="chevron-right" size={12} />
          </button>
          {currentArea && !origin && (
            <button
              disabled={location.status === "locating"}
              onClick={location.locate}
              aria-label={t("Use my location", "현재 위치 사용")}
            >
              <LocalIcon name="locate-fixed" size={17} />
            </button>
          )}
        </div>
        {currentArea &&
          (location.status === "denied" ||
            location.status === "unavailable") && (
            <p className="local-course-empty" role="status">
              {t("Using the selected area", "선택한 지역을 기준으로 추천해요")}
            </p>
          )}
        <div className="local-auto-preferences">
          {autoCourse.canBrowse && (
            <div
              className="local-auto-chips"
              role="group"
              aria-label={t("Afternoon choice", "오후 일정 선택")}
            >
              <button
                aria-pressed={!autoCourse.browse}
                onClick={() => change(() => autoCourse.changeAfternoon(false))}
              >
                {t("Café", "카페")}
              </button>
              <button
                aria-pressed={autoCourse.browse}
                onClick={() => change(() => autoCourse.changeAfternoon(true))}
              >
                {t("Browse shops", "구경")}
              </button>
            </div>
          )}
          {autoCourse.canIncludeLate && (
            <button
              className="local-auto-late"
              aria-pressed={autoCourse.includeLate}
              onClick={() => change(autoCourse.toggleLate)}
            >
              {autoCourse.includeLate && <LocalIcon name="check" />}
              {t("Include late night", "심야 포함")}
            </button>
          )}
        </div>
      </div>

      {autoCourse.status !== "success" ? (
        <ResourceNotice
          status={autoCourse.status}
          retry={autoCourse.retry}
          t={t}
        />
      ) : route.length ? (
        <section className="local-course-itinerary local-auto-itinerary">
          <div className="local-course-section-heading">
            <div className="local-auto-itinerary-title">
              <h2>{t("Visit order", "방문 순서")}</h2>
              {autoCourse.isPreview && (
                <small>{t("Sample data", "예시 데이터")}</small>
              )}
            </div>
            <button
              className="local-course-text-action"
              hidden={!autoCourse.hasOther}
              onClick={() => change(autoCourse.reroll)}
            >
              {t("Another course", "다른 코스")}
            </button>
          </div>
          <ol
            className="local-course-timeline"
            aria-label={t("Visit order", "방문 순서")}
          >
            {route.map(({ slot, place }, index) => {
              const alternatives = autoCourseAlternatives(
                route,
                slot,
                pools[slot] ?? [],
                origin,
              );
              const previous = route[index - 1]?.place;
              const open = replacing === slot && alternatives.length > 0;
              return (
                <li key={slot}>
                  {previous && (
                    <p className="local-course-distance">
                      {t("Straight line", "직선")}{" "}
                      {formatDistance.format(distanceMeters(previous, place))}
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
                      <Photo
                        key={place.id}
                        place={place}
                        decorative
                        className="local-auto-stop-photo"
                      />
                      <span className="local-place-info">
                        <span className="local-auto-stage">
                          {stageLabel(slot, place.category === "culture")}
                        </span>
                        <strong>{name(place)}</strong>
                        <span>
                          {areaLabels[language][place.area]} · {kind(place)}
                        </span>
                      </span>
                    </button>
                    {alternatives.length > 0 && (
                      <button
                        className="local-auto-swap"
                        aria-expanded={open}
                        aria-label={`${name(place)} · ${t("Replace stop", "장소 바꾸기")}`}
                        onClick={(event) => {
                          if (open) closeAlternatives();
                          else {
                            swapTrigger.current = event.currentTarget;
                            setReplacing(slot);
                          }
                        }}
                      >
                        {t("Replace", "바꾸기")}
                      </button>
                    )}
                  </div>
                  {open && (
                    <div
                      className="local-auto-alternatives"
                      role="group"
                      aria-label={t("Replacement options", "교체 후보")}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") closeAlternatives();
                      }}
                    >
                      {alternatives.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            autoCourse.replace(slot, item);
                            closeAlternatives();
                          }}
                        >
                          <Photo place={item} decorative />
                          <span>{name(item)}</span>
                          <LocalIcon name="chevron-right" size={14} />
                        </button>
                      ))}
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
      ) : (
        <div className="local-empty">
          <LocalIcon name="route" size={28} />
          <h2>
            {t(
              "No course for these conditions",
              "이 조건에 맞는 코스가 없어요",
            )}
          </h2>
          <button className="local-secondary" onClick={() => openTime()}>
            {t("Choose visit time", "방문 시간 선택")}
          </button>
        </div>
      )}
      <p className="local-sr-only" role="status">
        {route.map(({ place }) => name(place)).join(", ")}
      </p>
    </>
  );
}
