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
