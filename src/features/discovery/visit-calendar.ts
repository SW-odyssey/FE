import { visitDate } from "./visit-date.ts";

/** @returns Sunday-first calendar cells. Only dates in the current seven-day request window are selectable. */
export function visitCalendar(clock: Date, month: string) {
  const start = visitDate(clock, 0);
  const end = visitDate(clock, 6);
  const first = new Date(`${month}-01T00:00:00Z`);
  const length = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const leading = first.getUTCDay();
  const size = Math.ceil((leading + length) / 7) * 7;
  return Array.from({ length: size }, (_, i) => {
    const day = i - leading + 1;
    if (day < 1 || day > length) return null;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    return {
      date,
      day,
      offset: Math.round((Date.parse(date) - Date.parse(start)) / 86400000),
      enabled: date >= start && date <= end,
    };
  });
}

/** @returns The adjacent YYYY-MM calendar month, including year rollover. */
export function adjacentMonth(month: string, amount: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
