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
  | "summary"
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
    summary,
    t,
  } = props;
  return (
    <div
      key={`place-${selected.id}`}
      className="local-content local-detail"
      ref={scroll}
    >
      {
        <PhotoGallery
          key={selected.id}
          place={selected}
          language={language}
          photos={photosFor(selected)}
        />
      }
      <div className="local-detail-body">
        <h1>{name(selected)}</h1>

        {<PlaceSummary place={selected} t={t} summary={summary} />}
        <p className="local-detail-meta local-info-kind">
          <LocalIcon
            name={selected.category === "cafe" ? "coffee" : "utensils"}
            size={18}
          />
          {kind(selected)} {areaLabels[language][selected.area]}
        </p>
        <button className="local-address" onClick={() => copyAddress(selected)}>
          <LocalIcon name="map-pin" size={18} />
          <span>{selected.address}</span>
          <LocalIcon name="copy" size={17} />
        </button>
        <details className="local-place-source">
          <summary>{t("Place information", "장소 정보")}</summary>
          <p>{description(selected)}</p>
          <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
            {t("Original source", "원문 보기")} ↗
          </a>
          <p>
            {t("Photo", "사진")}{" "}
            {[
              ...new Set(photosFor(selected).map((photo) => photo.credit)),
            ].join(" / ")}
          </p>
        </details>
        <button
          className="local-map-preview"
          onClick={() => showPlaceOnMap(selected)}
        >
          <MiniMap place={selected} />
          <span>
            {t("View on map", "지도에서 보기")}
            <LocalIcon name="chevron-right" size={16} />
          </span>
        </button>
      </div>
    </div>
  );
}
