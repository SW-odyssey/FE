"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import MiniMap from "../../map/MiniMap";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { areaLabels } from "../presentation";
import { AreaVisitPatternCard } from "./AreaVisitPatternCard";
import PhotoGallery from "./PhotoGallery";
type Props = Pick<
  DiscoveryController,
  | "aiSummary"
  | "addPlaceToCourse"
  | "course"
  | "copyAddress"
  | "description"
  | "kind"
  | "language"
  | "name"
  | "openCourseFromDetail"
  | "photosFor"
  | "scroll"
  | "selected"
  | "showPlaceOnMap"
  | "selectedVisitDate"
  | "visitPattern"
  | "t"
> & { selected: NonNullable<DiscoveryController["selected"]> };
export function PlaceDetail(props: Props) {
  const {
    aiSummary,
    addPlaceToCourse,
    course,
    copyAddress,
    description,
    kind,
    language,
    name,
    openCourseFromDetail,
    photosFor,
    scroll,
    selected,
    showPlaceOnMap,
    selectedVisitDate,
    visitPattern,
    t,
  } = props;
  const area = areaLabels[language][selected.area];
  const inCourse = course.stops.some((stop) => stop.id === selected.id);
  const photoCredits = [
    ...new Set(
      photosFor(selected)
        .map((photo) => photo.credit)
        .filter(Boolean),
    ),
  ];
  return (
    <div
      key={`place-${selected.id}`}
      className="local-content local-detail"
      ref={scroll}
    >
      <PhotoGallery
        key={selected.id}
        place={selected}
        language={language}
        photos={photosFor(selected)}
      />
      <div className="local-detail-body">
        <header className="local-detail-heading">
          <h1>{name(selected)}</h1>
          <p className="local-detail-meta">
            <LocalIcon name="map-pin" size={15} />
            {area} · {kind(selected)}
          </p>
        </header>
        <section className="local-detail-section">
          <h2>{t("About this place", "장소 소개")}</h2>
          <p>{description(selected)}</p>
          <small className="local-place-source">
            <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
              {t("Original source", "원문 보기")} ↗
            </a>
            {photoCredits.length > 0 && (
              <span>
                {t("Photo", "사진")} {photoCredits.join(" / ")}
              </span>
            )}
          </small>
        </section>
        {visitPattern && (
          <AreaVisitPatternCard
            key={selectedVisitDate}
            language={language}
            pattern={visitPattern}
            visitDate={selectedVisitDate}
          />
        )}
        {aiSummary && (
          <section className="local-detail-section">
            <h2>{t("AI place summary", "AI 매장 요약")}</h2>
            <p>{aiSummary}</p>
            <small className="local-place-ai-note">
              {t("Generated with Gemini", "Gemini로 자동 생성")}
            </small>
          </section>
        )}
        <section className="local-detail-section">
          <h2>{t("Getting there", "위치")}</h2>
          <button
            className="local-address"
            onClick={() => copyAddress(selected)}
          >
            <LocalIcon name="map-pin" size={18} />
            <span>{selected.address}</span>
            <LocalIcon name="copy" size={17} />
          </button>
          <button
            className="local-map-preview"
            onClick={() => showPlaceOnMap(selected)}
            aria-label={t("View on map", "지도에서 보기")}
          >
            <MiniMap place={selected} />
          </button>
        </section>
      </div>
      <div className="local-detail-action local-course-detail-actions">
        <button
          className="local-secondary local-course-detail-map"
          onClick={() => showPlaceOnMap(selected)}
          aria-label={t("View on map", "지도에서 보기")}
          title={t("View on map", "지도에서 보기")}
        >
          <LocalIcon name="map" size={21} />
        </button>
        <button
          className="local-primary"
          onClick={() =>
            inCourse ? openCourseFromDetail() : addPlaceToCourse(selected)
          }
        >
          <LocalIcon name={inCourse ? "check" : "route"} size={20} />
          {inCourse
            ? t("View my course", "내 코스 보기")
            : t("Add to course", "코스에 담기")}
        </button>
      </div>
    </div>
  );
}
