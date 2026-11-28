import { LocalIcon } from "../../../components/ui/LocalIcon";
import { cellReasonChip, cellReasonText } from "../cell-reasons";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import type { LocalPlace } from "../model";
import { Photo, type SheetThumbnail } from "./PlacePhoto";
export function renderPlaceRow(
  model: Pick<
    DiscoveryController,
    | "openPlace"
    | "view"
    | "mapId"
    | "name"
    | "kind"
    | "areaName"
    | "reasonsFor"
    | "language"
  >,
  p: LocalPlace,
  onClick = () => model.openPlace(p),
  small = false,
  thumbnail?: SheetThumbnail,
) {
  const { view, mapId, name, kind, areaName, reasonsFor, language } = model;
  const area = areaName(p.area);
  const reasons = reasonsFor(p);
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
              {area && `, ${area}`}
            </span>
            {reasons.length > 0 && (
              <span className="local-place-reasons">
                {reasons.map((code) => (
                  <span key={code} title={cellReasonText(code, language)}>
                    {cellReasonChip(code, language)}
                  </span>
                ))}
              </span>
            )}
            {attribution}
          </span>
        )}
      />
      <LocalIcon name="chevron-right" size={16} />
    </button>
  );
}
