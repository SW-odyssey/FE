"use client";
import { useState } from "react";
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
  const [automaticTime, setAutomaticTime] = useState(false);
  const [calendarRevision, setCalendarRevision] = useState(0);
  const selectedSlot = automaticTime ? slotAt(seoulHour(clock)) : draftSlot;

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
          key={calendarRevision}
          clock={clock}
          day={draftDay}
          language={language}
          onChange={(nextDay) => {
            if (nextDay === draftDay) return;
            setDraftDay(nextDay);
            setDraftSlot(selectedSlot);
            setAutomaticTime(false);
          }}
        />
        <SegmentedChoice
          className="local-visit-slots"
          label={t("Time", "시간대")}
          value={selectedSlot}
          onChange={(nextSlot) => {
            if (nextSlot === selectedSlot) return;
            setDraftSlot(nextSlot);
            setAutomaticTime(false);
          }}
          options={visitSlots.map((slot) => ({
            value: slot,
            label: slotLabels[language][slot],
          }))}
        />
        <p className="local-selected-time-range" aria-live="polite">
          {slotHours[selectedSlot]}
        </p>
      </div>
      <div className="local-sheet-footer local-time-actions">
        <button
          className="local-filter-reset local-use-now"
          onClick={() => {
            setDraftDay(0);
            setAutomaticTime(true);
            setCalendarRevision((revision) => revision + 1);
          }}
        >
          {discoveryCopy[language].currentTime}
        </button>
        <button
          className="local-primary"
          onClick={() => {
            confirmTime({
              autoTime: automaticTime,
              day: draftDay,
              slot: selectedSlot,
            });
          }}
        >
          {discoveryCopy[language].apply}
        </button>
      </div>
    </>
  );
}
