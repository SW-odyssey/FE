"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { type DiscoveryArea } from "../model";
import { areaLabels } from "../presentation";
import { SheetHeader } from "./SheetHeader";
type Props = Pick<
  DiscoveryController,
  | "area"
  | "chooseArea"
  | "closeModal"
  | "language"
  | "selectPreviewLocation"
  | "t"
>;
export function AreaSheet(props: Props) {
  const { area, chooseArea, closeModal, language, selectPreviewLocation, t } =
    props;
  return (
    <>
      <div className="local-drag-indicator" />
      {<SheetHeader title={t("Area", "지역")} t={t} closeModal={closeModal} />}
      <button className="local-secondary" onClick={selectPreviewLocation}>
        <LocalIcon name="locate-fixed" size={18} />
        {t("Use my location", "내 위치 사용")}
      </button>
      <div className="local-area-list">
        {(Object.keys(areaLabels.en) as DiscoveryArea[]).map((id) => (
          <button
            key={id}
            onClick={() => chooseArea(id)}
            aria-pressed={area === id}
          >
            <span>{areaLabels[language][id]}</span>
            {area === id && <LocalIcon name="check" />}
          </button>
        ))}
      </div>
    </>
  );
}
