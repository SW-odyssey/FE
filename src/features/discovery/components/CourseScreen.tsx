"use client";

import { LocalIcon } from "../../../components/ui/LocalIcon";
import { distanceMeters } from "../../map/geometry";
import type { useDeviceLocation } from "../../map/useDeviceLocation";
import { googleMapsCourseLink, googleMapsPlaceUrl } from "../course";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { dateLocales } from "../localization";
import { visitDate } from "../visit-date";
import { CourseTimeline } from "./CourseTimeline";
import { DiscoveryContextBar } from "./DiscoveryContextBar";
import { LanguageButton } from "./LanguageButton";
import { ResourceNotice } from "./ResourceNotice";

type Props = Pick<
  DiscoveryController,
  | "autoCourse"
  | "clock"
  | "contextAreaLabel"
  | "courseDate"
  | "courseLocation"
  | "courseOptions"
  | "courseTimeLabel"
  | "currentArea"
  | "language"
  | "name"
  | "openPlace"
  | "openTime"
  | "scroll"
  | "setModal"
  | "showCourseOnMap"
  | "toggleCourseOption"
  | "t"
> & { location: ReturnType<typeof useDeviceLocation>; desktop: boolean };

export function CourseScreen({
  autoCourse,
  clock,
  contextAreaLabel,
  courseDate,
  courseLocation,
  courseOptions,
  courseTimeLabel,
  currentArea,
  desktop,
  language,
  location,
  name,
  openPlace,
  openTime,
  scroll,
  setModal,
  showCourseOnMap,
  toggleCourseOption,
  t,
}: Props) {
  const { route } = autoCourse;
  const stops = route.map(({ place }) => place);
  const mapsLink = googleMapsCourseLink(stops);
  const totalDistance = stops
    .slice(1)
    .reduce((sum, stop, index) => sum + distanceMeters(stops[index], stop), 0);
  const title =
    courseDate === visitDate(clock, 0)
      ? t("Today's course", "오늘의 코스")
      : t("Recommended course", "추천 코스");
  const formatDistance = new Intl.NumberFormat(dateLocales[language], {
    style: "unit",
    unit: "meter",
    maximumFractionDigits: 0,
  });
  const formatNumber = new Intl.NumberFormat(dateLocales[language], {
    maximumFractionDigits: 0,
  });
  const courseChips = [
    {
      option: "includeCafe",
      available: autoCourse.canIncludeCafe,
      icon: "coffee",
      label: t("Café", "카페"),
    },
    {
      option: "includeBrowse",
      available: autoCourse.canIncludeBrowse,
      icon: "compass",
      label: t("Browse", "구경"),
    },
    {
      option: "includeLate",
      available: autoCourse.canIncludeLate,
      icon: "clock",
      label: t("Late night", "심야"),
    },
  ] as const;
  const availableChips = courseChips.filter(({ available }) => available);

  return (
    <div className="local-content local-course" ref={scroll}>
      <header className="local-course-heading">
        <h1>{title}</h1>
        <LanguageButton
          className="local-course-language"
          label={t("Choose language", "언어 선택")}
          onClick={() => setModal("menu")}
        />
      </header>

      <div className="local-discovery-controls local-course-controls">
        <DiscoveryContextBar
          currentArea={currentArea}
          setModal={setModal}
          t={t}
          contextAreaLabel={
            courseLocation ? t("My location", "내 위치") : contextAreaLabel
          }
          openTime={openTime}
          timeLabel={courseTimeLabel}
        />
        {availableChips.length > 0 && (
          <div
            className="local-category-tabs local-course-option-chips"
            role="group"
            aria-label={t("Course options", "일정 구성")}
          >
            {availableChips.map(({ option, icon, label }) => (
              <button
                key={option}
                type="button"
                className={courseOptions[option] ? "is-active" : ""}
                aria-pressed={courseOptions[option]}
                onClick={() => toggleCourseOption(option)}
              >
                <LocalIcon name={icon} size={16} />
                {label}
              </button>
            ))}
          </div>
        )}
        {currentArea &&
          (location.status === "denied" ||
            location.status === "unavailable") && (
            <p className="local-course-location-note" role="status">
              {t("Using the selected area", "선택한 지역을 기준으로 추천해요")}
            </p>
          )}
      </div>

      {autoCourse.status !== "success" ? (
        <ResourceNotice
          status={autoCourse.status}
          retry={autoCourse.retry}
          t={t}
        />
      ) : (
        <section className="local-course-itinerary">
          {route.length > 0 && (
            <div className="local-course-overview">
              <h2>{t("Visit order", "방문 순서")}</h2>
              <dl
                className="local-course-summary"
                aria-label={t("Course summary", "코스 요약")}
              >
                <div>
                  <dt>{t("Stops", "장소")}</dt>
                  <dd>
                    {formatNumber.format(stops.length)}
                    {language === "ko" && "곳"}
                  </dd>
                </div>
                {stops.length > 1 && (
                  <div>
                    <dt>{t("Straight line", "직선 거리")}</dt>
                    <dd>{formatDistance.format(totalDistance)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          <CourseTimeline
            route={route}
            formatDistance={formatDistance}
            language={language}
            name={name}
            openPlace={openPlace}
            t={t}
          />
          {route.length === 0 ? (
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
          ) : (
            <div className="local-course-footer">
              {(!desktop || autoCourse.canSuggestAnother) && (
                <div className="local-course-actions">
                  {autoCourse.canSuggestAnother && (
                    <button
                      type="button"
                      className="local-course-resuggest"
                      onClick={autoCourse.suggestAnother}
                    >
                      <LocalIcon name="refresh" size={15} />
                      {t("Rebuild course", "코스 다시 만들기")}
                    </button>
                  )}
                  {!desktop && (
                    <button
                      type="button"
                      className="local-primary local-course-map-toggle"
                      onClick={showCourseOnMap}
                    >
                      <LocalIcon name="map" size={17} />
                      {t("View map", "지도 보기")}
                    </button>
                  )}
                </div>
              )}
              {mapsLink ? (
                <a
                  className="local-course-google"
                  href={mapsLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {stops.length > 1
                    ? t(
                        "View places in Google Maps",
                        "구글맵에서 장소 목록 보기",
                      )
                    : t("Open in Google Maps", "구글맵에서 열기")}
                  <LocalIcon name="external-link" size={16} />
                </a>
              ) : (
                <details className="local-course-google-options">
                  <summary className="local-course-google">
                    {t(
                      "Open each place in Google Maps",
                      "구글맵에서 장소별로 보기",
                    )}
                    <LocalIcon name="chevron-right" size={16} />
                  </summary>
                  <ol>
                    {stops.map((place) => (
                      <li key={place.id}>
                        <a
                          href={googleMapsPlaceUrl(place)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span>{name(place)}</span>
                          <LocalIcon name="external-link" size={15} />
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          )}
        </section>
      )}
      <p className="local-sr-only" role="status">
        {route.map(({ place }) => name(place)).join(", ")}
      </p>
    </div>
  );
}
