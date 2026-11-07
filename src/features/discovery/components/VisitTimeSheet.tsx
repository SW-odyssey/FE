"use client";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { slotLabels } from "../presentation";
import { slotAt, slotHours, visitSlots } from "../visit-time";
import { seoulHour } from "../visit-date";
import { discoveryCopy } from "../recommendation-analysis";
import { SegmentedChoice } from "./SegmentedChoice";
import { SheetHeader } from "./SheetHeader";
import { VisitCalendar } from "./VisitCalendar";
type Props = Pick<
  DiscoveryController,
  | "clock"
  | "closeModal"
  | "confirmTime"
  | "draftDay"
  | "draftSlot"
  | "language"
  | "setDraftDay"
  | "setDraftSlot"
  | "t"
  | "timeReturn"
>;
export function VisitTimeSheet(props: Props) {
  const {
    clock,
    closeModal,
    confirmTime,
    draftDay,
    draftSlot,
    language,
    setDraftDay,
    setDraftSlot,
    t,
    timeReturn,
  } = props;
  return (
    <>
      <div className="local-drag-indicator" />
      {
        <SheetHeader
          title={t("Visit time", "방문 시간")}
          back={timeReturn === "filters"}
          t={t}
          closeModal={closeModal}
        />
      }
      <div className="local-visit-options">
        <VisitCalendar
          clock={clock}
          day={draftDay}
          language={language}
          onChange={setDraftDay}
        />
        <SegmentedChoice
          className="local-visit-slots"
          label={t("Time", "시간대")}
          value={draftSlot}
          onChange={setDraftSlot}
          options={visitSlots.map((slot) => ({
            value: slot,
            label: slotLabels[language][slot],
          }))}
        />
        <p className="local-selected-time-range" aria-live="polite">
          {slotHours[draftSlot]}
        </p>
      </div>
      <div className="local-sheet-footer local-time-actions">
        <button
          className="local-secondary local-use-now"
          onClick={() => {
            confirmTime({
              autoTime: true,
              day: 0,
              slot: slotAt(seoulHour(clock)),
            });
          }}
        >
          {discoveryCopy[language].currentTime}
        </button>
        <button
          className="local-primary"
          onClick={() => {
            confirmTime({
              autoTime: false,
              day: draftDay,
              slot: draftSlot,
            });
          }}
        >
          {discoveryCopy[language].apply}
        </button>
      </div>
    </>
  );
}
