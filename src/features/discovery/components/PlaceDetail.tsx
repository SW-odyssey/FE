"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import MiniMap from "../../map/MiniMap";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { areaLabels } from "../presentation";
import PhotoGallery from "./PhotoGallery";
import { PlaceSummary } from "./PlaceSummary";
type Props = Pick<
  DiscoveryController,
  | "copyAddress"
  | "description"
  | "kind"
  | "language"
  | "name"
  | "photosFor"
  | "scroll"
  | "selected"
  | "showPlaceOnMap"
  | "analysisFor"
  | "timeLabel"
  | "t"
> & { selected: NonNullable<DiscoveryController["selected"]> };
export function PlaceDetail(props: Props) {
  const {
    copyAddress,
    description,
    kind,
    language,
    name,
    photosFor,
    scroll,
    selected,
    showPlaceOnMap,
    analysisFor,
    timeLabel,
    t,
  } = props;
  const area = areaLabels[language][selected.area];
  // Only facts the data source already carries: no ratings, hours or distance.
  const facts = [
    {
      icon: selected.category === "cafe" ? "coffee" : "utensils",
      value: kind(selected),
      label: t("Type", "유형"),
    },
    { icon: "map-pin", value: area, label: t("Area", "지역") },
    { icon: "clock", value: timeLabel, label: t("Visit time", "방문 시간") },
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
        <dl className="local-detail-facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <LocalIcon name={fact.icon} size={18} />
              <dd>{fact.value}</dd>
              <dt>{fact.label}</dt>
            </div>
          ))}
        </dl>
        <PlaceSummary
          place={selected}
          analysisFor={analysisFor}
          language={language}
        />
        <section className="local-detail-section">
          <h2>{t("About this place", "장소 소개")}</h2>
          <p>{description(selected)}</p>
          <p className="local-place-source">
            <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
              {t("Original source", "원문 보기")} ↗
            </a>
            <span>
              {t("Photo", "사진")}{" "}
              {[
                ...new Set(photosFor(selected).map((photo) => photo.credit)),
              ].join(" / ")}
            </span>
          </p>
        </section>
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
      <div className="local-detail-action">
        <button
          className="local-primary"
          onClick={() => showPlaceOnMap(selected)}
        >
          {t("View on map", "지도에서 보기")}
          <LocalIcon name="arrow-right" size={18} />
        </button>
      </div>
    </div>
  );
}
