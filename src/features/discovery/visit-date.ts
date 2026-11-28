const seoulCalendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  calendar: "iso8601",
  numberingSystem: "latn",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const seoulTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  numberingSystem: "latn",
  hour: "2-digit",
  hourCycle: "h23",
});
const seoulClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  numberingSystem: "latn",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * @param clock Instant used by the screen, left unchanged
 * @returns Minutes since midnight in Seoul (0..1439) on every device timezone
 */
export function seoulMinutes(clock: Date): number {
  const parts = seoulClock.formatToParts(clock);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)!.value);
  return value("hour") * 60 + value("minute");
}

/**
 * @param date YYYY-MM-DD
 * @param days Calendar days to add, negative for earlier days
 * @returns The shifted YYYY-MM-DD across month and year boundaries
 */
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * @param clock Instant used by the screen, left unchanged
 * @returns Seoul hour in 0..23, using 0 at midnight on every device timezone
 */
export function seoulHour(clock: Date): number {
  return Number(seoulTime.format(clock));
}

/**
 * @param clock Instant used by the screen, left unchanged
 * @param day Day offset, truncated and bounded to 0..6; auto mode passes 0
 * @returns YYYY-MM-DD in Seoul, independent of the device timezone
 */
export function visitDate(clock: Date, day: number): string {
  const parts = seoulCalendar.formatToParts(clock);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)!.value;
  const date = new Date(
    `${part("year")}-${part("month")}-${part("day")}T00:00:00.000Z`,
  );
  const offset = Math.max(0, Math.min(6, Math.trunc(day) || 0));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
