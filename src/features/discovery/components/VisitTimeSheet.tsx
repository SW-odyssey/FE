"use client";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { slotLabels } from "../presentation";
import { slotAt, slotHours, visitSlots } from "../visit-time";
import { SheetHeader } from "./SheetHeader";
import { Wheel } from "./WheelPicker";
type Props = Pick<
  DiscoveryController,
  | "clock"
  | "closeModal"
  | "confirmTime"
  | "days"
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
    days,
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
      <div className="local-wheel-picker">
        <div className="local-wheel-band" />
        <Wheel
          label={t("Day", "날짜")}
          items={days}
          value={draftDay}
          onChange={setDraftDay}
        />
        <Wheel
          label={t("Time", "시간대")}
          items={visitSlots.map((x) => slotLabels[language][x])}
          value={visitSlots.indexOf(draftSlot)}
          onChange={(i) => setDraftSlot(visitSlots[i])}
        />
      </div>
      <p className="local-time-range">{slotHours[draftSlot]}</p>
      <div className="local-sheet-footer local-time-actions">
        <button
          className="local-secondary local-use-now"
          onClick={() => {
            confirmTime({
              autoTime: true,
              day: 0,
              slot: slotAt(clock.getHours()),
            });
          }}
        >
          {t("Use current time", "현재 시간으로")}
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
          {t("Apply", "적용")}
        </button>
      </div>
    </>
  );
}
