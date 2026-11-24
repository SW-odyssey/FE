import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import type { LocalPlace } from "../model";
import { areaLabels } from "../presentation";
import { Photo, type SheetThumbnail } from "./PlacePhoto";
export function renderPlaceRow(
  model: Pick<
    DiscoveryController,
    "openPlace" | "view" | "mapId" | "name" | "kind" | "language"
  >,
  p: LocalPlace,
  onClick = () => model.openPlace(p),
  small = false,
  thumbnail?: SheetThumbnail,
) {
  const { view, mapId, name, kind, language } = model;
  return (
    <button
      key={p.id}
      className={`local-place-row ${small ? "is-small" : ""} ${view === "map" && mapId === p.id ? "is-selected" : ""}`}
      aria-current={view === "map" && mapId === p.id ? "true" : undefined}
      onClick={onClick}
    >
      <Photo
        place={p}
        thumbnail={thumbnail}
        caption={(attribution) => (
          <span className="local-place-info">
            <strong>{name(p)}</strong>
            <span>
              {kind(p)}
              {p.area && `, ${areaLabels[language][p.area]}`}
            </span>
            {attribution}
          </span>
        )}
      />
      <LocalIcon name="chevron-right" size={16} />
    </button>
  );
}
