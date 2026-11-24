"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { googleMapsPlaceUrl } from "../course";
import MiniMap from "../../map/MiniMap";
import { usePlaceMedia } from "../hooks/usePlaceMedia";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { areaLabels } from "../presentation";
import { AreaVisitPatternCard } from "./AreaVisitPatternCard";
import PhotoGallery from "./PhotoGallery";
import { PlaceAiSummary } from "./PlaceAiSummary";
import { PlaceBusinessInfo } from "./PlaceBusinessInfo";
type Props = Pick<
  DiscoveryController,
  | "aiSummary"
  | "copyAddress"
  | "description"
  | "kind"
  | "language"
  | "name"
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
    copyAddress,
    description,
    kind,
    language,
    name,
    photosFor,
    scroll,
    selected,
    showPlaceOnMap,
    selectedVisitDate,
    visitPattern,
    t,
  } = props;
  const { media, pending } = usePlaceMedia(selected, language);
  const photos = media?.photoList.length
    ? media.photoList
    : photosFor(selected);
  const address = media?.address || selected.address;
  const area = selected.area && areaLabels[language][selected.area];
  const editorial = description(selected);
  const about = editorial || media?.business?.about;
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
        photos={photos}
        pending={pending}
      />
      <div className="local-detail-body">
        <header className="local-detail-heading">
          <h1>{name(selected)}</h1>
          <p className="local-detail-meta">
            <LocalIcon name="map-pin" size={15} />
            {area ? `${area} · ` : ""}
            {kind(selected)}
          </p>
        </header>
        {(about || selected.sourceUrl || photoCredits.length > 0) && (
          <section className="local-detail-section">
            <h2>{t("About this place", "장소 소개")}</h2>
            {about && <p>{about}</p>}
            <small className="local-place-source">
              {selected.sourceUrl && (
                <a href={selected.sourceUrl} target="_blank" rel="noreferrer">
                  {t("Original source", "원문 보기")} ↗
                </a>
              )}
              {!editorial && media?.business?.about && (
                <span translate="no">Google Maps</span>
              )}
              {photoCredits.length > 0 && (
                <span>
                  {t("Photo", "사진")} {photoCredits.join(" / ")}
                </span>
              )}
            </small>
          </section>
        )}
        {media?.business && (
          <PlaceBusinessInfo business={media.business} language={language} />
        )}
        {visitPattern && (
          <AreaVisitPatternCard
            key={
              visitPattern?.provenance === "live"
                ? `${visitPattern.datasetId}/${selectedVisitDate}`
                : selectedVisitDate
            }
            language={language}
            pattern={visitPattern}
            visitDate={selectedVisitDate}
          />
        )}
        <PlaceAiSummary
          id={selected.id}
          googlePlaceId={selected.googlePlaceId}
          curatedSummary={aiSummary}
          language={language}
        />
        <section className="local-detail-section">
          <h2>{t("Getting there", "위치")}</h2>
          {address && (
            <button
              className="local-address"
              onClick={() => copyAddress({ ...selected, address })}
            >
              <LocalIcon name="map-pin" size={18} />
              <span>{address}</span>
              <LocalIcon name="copy" size={17} />
            </button>
          )}
          <button
            className="local-map-preview"
            onClick={() => showPlaceOnMap(selected)}
            aria-label={t("View on map", "지도에서 보기")}
          >
            <MiniMap place={selected} language={language} />
          </button>
          <a
            className="local-detail-maps-link"
            href={media?.business?.mapsUrl ?? googleMapsPlaceUrl(selected)}
            target="_blank"
            rel="noreferrer"
          >
            {t("Open in Google Maps", "구글맵에서 열기")}
            <LocalIcon name="external-link" size={16} />
          </a>
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
