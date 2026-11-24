"use client";

import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { useDeviceLocation } from "../../map/useDeviceLocation";
import {
  googleMapsCourseLink,
  googleMapsPlaceUrl,
  toggleAfternoonChoice,
} from "../course";
import type { CourseGap } from "../data/course-api";
import { slotLabels } from "../presentation";
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
  | "courseStartSlot"
  | "changeCourseOptions"
  | "courseTimeLabel"
  | "currentArea"
  | "kind"
  | "language"
  | "name"
  | "openPlace"
  | "openTime"
  | "scroll"
  | "setModal"
  | "showCourseOnMap"
  | "t"
> & { location: ReturnType<typeof useDeviceLocation>; desktop: boolean };

export function CourseScreen({
  autoCourse,
  clock,
  contextAreaLabel,
  courseDate,
  courseLocation,
  courseOptions,
  courseStartSlot,
  changeCourseOptions,
  courseTimeLabel,
  currentArea,
  desktop,
  kind,
  language,
  location,
  name,
  openPlace,
  openTime,
  scroll,
  setModal,
  showCourseOnMap,
  t,
}: Props) {
  const { route, skipped, interruption } = autoCourse;
  const loading =
    autoCourse.status === "loading" || (autoCourse.pending && !route.length);
  const updating = autoCourse.pending && !loading;
  const showAfternoon =
    courseStartSlot === "lunch" || courseStartSlot === "afternoon";
  const stops = route.map(({ place }) => place);
  const mapsLink = googleMapsCourseLink(stops);
  const totalDistance = route
    .slice(1)
    .reduce((sum, stop) => sum + stop.distanceMeters, 0);
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
        <div
          className="local-category-tabs local-course-option-chips"
          role="group"
          aria-label={t("Course options", "일정 구성")}
        >
          {showAfternoon &&
            (["cafe", "shop"] as const).map((afternoon) => {
              const active =
                courseOptions.afternoon === "mixed" ||
                courseOptions.afternoon === afternoon;
              return (
                <button
                  key={afternoon}
                  type="button"
                  className={active ? "is-active" : ""}
                  aria-pressed={active}
                  aria-label={
                    afternoon === "cafe"
                      ? t("Include a café", "카페 포함")
                      : t("Include shopping", "구경 포함")
                  }
                  onClick={() =>
                    changeCourseOptions({
                      ...courseOptions,
                      afternoon: toggleAfternoonChoice(
                        courseOptions.afternoon,
                        afternoon,
                      ),
                    })
                  }
                >
                  <LocalIcon
                    name={afternoon === "cafe" ? "coffee" : "compass"}
                    size={14}
                  />
                  {afternoon === "cafe"
                    ? t("Café", "카페")
                    : t("Browse", "구경")}
                </button>
              );
            })}
          {courseStartSlot !== "late" && (
            <button
              type="button"
              className={courseOptions.lateNight ? "is-active" : ""}
              aria-pressed={courseOptions.lateNight}
              onClick={() =>
                changeCourseOptions({
                  ...courseOptions,
                  lateNight: !courseOptions.lateNight,
                })
              }
            >
              <LocalIcon name="clock" size={14} />
              {t("Late night", "심야")}
            </button>
          )}
          <button
            type="button"
            className={courseOptions.walk === "short" ? "is-active" : ""}
            aria-pressed={courseOptions.walk === "short"}
            onClick={() =>
              changeCourseOptions({
                ...courseOptions,
                walk: courseOptions.walk === "short" ? "default" : "short",
              })
            }
          >
            {t("Short walks", "짧게 걷기")}
          </button>
        </div>
        {currentArea &&
          (location.status === "denied" ||
            location.status === "unavailable") && (
            <p className="local-course-location-note" role="status">
              {t("Using the selected area", "선택한 지역을 기준으로 추천해요")}
            </p>
          )}
      </div>

      {updating && (
        <p className="local-sr-only" role="status">
          {t("Updating course…", "코스를 업데이트하는 중…")}
        </p>
      )}
      {loading ? (
        <CourseLoading t={t} />
      ) : autoCourse.status !== "success" ? (
        <ResourceNotice
          status={autoCourse.status}
          retry={autoCourse.retry}
          t={t}
        />
      ) : (
        <section
          className="local-course-itinerary"
          aria-busy={autoCourse.pending}
        >
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
            kind={kind}
            changeSlot={autoCourse.regenerate}
            pending={autoCourse.pending}
            route={route}
            rebuildVersion={autoCourse.rebuildVersion}
            scrollOnRebuild={desktop ? undefined : scroll}
            formatDistance={formatDistance}
            language={language}
            name={name}
            openPlace={openPlace}
            t={t}
          />
          {(autoCourse.error === "replace" ||
            autoCourse.error === "no-replacement") && (
            <p className="local-course-location-note" role="status">
              {autoCourse.error === "no-replacement"
                ? t("No other places nearby", "근처에 바꿀 만한 곳이 없어요")
                : t(
                    "Could not update the course",
                    "코스를 다시 만들지 못했어요",
                  )}
            </p>
          )}
          {skipped.length > 0 && (
            <ul className="local-course-gaps">
              {skipped.map((gap) => (
                <li key={gap.position}>
                  {gap.position}. {slotLabels[language][gap.slot]} ·{" "}
                  {t("Stop skipped", "방문지 건너뜀")} ·{" "}
                  {courseOptions.afternoon === "mixed" &&
                  gap.position === 3 &&
                  gap.reason === "NO_NEARBY_MATCH"
                    ? t("No shops nearby", "근처에 구경할 곳이 없어요")
                    : courseGapMessage(gap, t)}
                </li>
              ))}
            </ul>
          )}
          {interruption && (
            <p className="local-course-location-note" role="status">
              {slotLabels[language][interruption.slot]} ·{" "}
              {!autoCourse.pending &&
              courseOptions.afternoon === "shop" &&
              interruption.slot === "afternoon" &&
              interruption.reason === "NO_NEARBY_MATCH"
                ? t(
                    "No shops nearby. Try choosing a café.",
                    "근처에 구경할 곳이 없어요. 카페로 바꿔 보세요.",
                  )
                : courseGapMessage(interruption, t)}
            </p>
          )}
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
              {autoCourse.canRegenerate && (
                <button
                  className="local-secondary"
                  disabled={autoCourse.pending}
                  onClick={() => autoCourse.regenerate()}
                >
                  {t("Rebuild course", "코스 다시 만들기")}
                </button>
              )}
            </div>
          ) : (
            <div className="local-course-footer">
              <div className="local-course-actions">
                <button
                  type="button"
                  className="local-course-resuggest"
                  disabled={autoCourse.pending}
                  onClick={() => autoCourse.regenerate()}
                >
                  <LocalIcon name="refresh" size={15} />
                  {t("Rebuild course", "코스 다시 만들기")}
                </button>
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

function CourseLoading({ t }: { t: Props["t"] }) {
  return (
    <section className="local-course-itinerary local-course-loading">
      <div className="local-course-overview">
        <h2>{t("Visit order", "방문 순서")}</h2>
        <p className="local-course-location-note" role="status">
          {t("Loading course…", "코스를 불러오는 중…")}
        </p>
      </div>
      <ol className="local-course-timeline" aria-hidden="true">
        {[0, 1, 2].map((stop) => (
          <li
            key={stop}
            data-first={stop === 0 || undefined}
            data-last={stop === 2 || undefined}
          >
            <div className="local-course-timeline-item">
              {stop > 0 && (
                <div className="local-course-stop-controls">
                  <span className="local-course-skeleton-leg local-skeleton" />
                </div>
              )}
              <div className="local-course-stop">
                <span className="local-course-pin local-skeleton" />
                <div className="local-course-stop-detail">
                  <div className="local-photo local-skeleton" />
                  <div className="local-course-skeleton-copy">
                    <span className="local-skeleton" />
                    <span className="local-skeleton" />
                    <span className="local-skeleton" />
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function courseGapMessage(gap: CourseGap, t: Props["t"]) {
  switch (gap.reason) {
    case "NO_NEARBY_MATCH":
      return t("No matching places nearby", "근처에 조건에 맞는 곳이 없어요");
    case "ALL_EXCLUDED":
      return t("No other places nearby", "근처에 바꿀 만한 곳이 없어요");
    case "NO_VERIFIED_MATCH":
      return t(
        "No places with confirmed hours",
        "영업시간이 맞는 곳을 찾지 못했어요",
      );
    case "CHECK_LIMIT":
      return t(
        "Try rebuilding to check other places",
        "코스를 다시 만들어 다른 장소를 확인해 보세요",
      );
    case "VERIFICATION_UNAVAILABLE":
      return t(
        "Could not check hours. Try again shortly.",
        "영업시간을 확인하지 못했어요. 잠시 후 다시 시도해 주세요",
      );
    case "SKIPPED_FOR_ROUTE":
      return t(
        "Skipped to keep the route walkable",
        "걸어서 이어가기 어려운 방문지를 건너뛰었어요",
      );
  }
}
