import type { ClockWindow, SlotWindow } from "./data/service-meta.ts";
import type { VisitSlot } from "./model.ts";
import { seoulMinutes, shiftDate, visitDate } from "./visit-date.ts";

export const visitSlots: VisitSlot[] = [
  "lunch",
  "afternoon",
  "evening",
  "late",
];

/**
 * BE #100 slot windows, used only until GET /api/v2/meta arrives and by the
 * preview, which has no metadata. The live screens read `slotWindows`.
 */
export const defaultSlotWindows: readonly SlotWindow[] = [
  { slot: "lunch", from: "11:00", toExclusive: "13:00", endsNextDay: false },
  {
    slot: "afternoon",
    from: "14:00",
    toExclusive: "17:00",
    endsNextDay: false,
  },
  { slot: "evening", from: "18:00", toExclusive: "21:00", endsNextDay: false },
  { slot: "late", from: "22:00", toExclusive: "01:00", endsNextDay: true },
];

function minutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function span(window: ClockWindow) {
  const start = minutes(window.from);
  const end = minutes(window.toExclusive) + (window.endsNextDay ? 24 * 60 : 0);
  return { start, end };
}

/**
 * @param windows Slot windows from the metadata
 * @returns "11:00–13:00" per slot; a slot the server does not list is "".
 */
export function slotHoursFrom(
  windows: readonly SlotWindow[],
): Record<VisitSlot, string> {
  const hours = { lunch: "", afternoon: "", evening: "", late: "" };
  for (const window of windows)
    hours[window.slot] = `${window.from}–${window.toExclusive}`;
  return hours;
}

/** The automatic visit for the current Seoul time. */
export type AutoVisit = {
  /** True when the current time is inside a slot window. */
  open: boolean;
  /** The current slot, or the next one that has data. */
  slot: VisitSlot;
  /**
   * The calendar day whose weekday the request uses. After midnight inside
   * a window that ends the next day this is the previous day: BE reads
   * Saturday 00:30 as Friday late night.
   */
  visitDate: string;
  from: string;
  toExclusive: string;
};

/**
 * @param clock Current instant
 * @param windows Slot windows; gaps between them have no data
 * @returns The open slot, or the next slot and its date when no slot covers
 * the current time. Only automatic "now" uses this; a date and slot picked by
 * the user mean that day's window as-is.
 */
export function autoVisit(
  clock: Date,
  windows: readonly SlotWindow[] = defaultSlotWindows,
): AutoVisit {
  const list = (windows.length ? windows : defaultSlotWindows)
    .map((window) => ({ window, ...span(window) }))
    .sort((a, b) => a.start - b.start);
  const now = seoulMinutes(clock);
  const today = visitDate(clock, 0);
  const visit = (window: SlotWindow, date: string, open: boolean) => ({
    open,
    slot: window.slot,
    visitDate: date,
    from: window.from,
    toExclusive: window.toExclusive,
  });
  for (const { window, start, end } of list) {
    if (now >= start && now < end) return visit(window, today, true);
    if (now + 24 * 60 >= start && now + 24 * 60 < end)
      return visit(window, shiftDate(today, -1), true);
  }
  const next = list.find(({ start }) => start > now);
  return next
    ? visit(next.window, today, false)
    : visit(list[0]!.window, shiftDate(today, 1), false);
}
