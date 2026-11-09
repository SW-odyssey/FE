import type { VisitSlot } from "./model.ts";
export const visitSlots: VisitSlot[] = [
  "lunch",
  "afternoon",
  "evening",
  "late",
];
export const slotHours: Record<VisitSlot, string> = {
  lunch: "11:00–13:00",
  afternoon: "14:00–17:00",
  evening: "18:00–21:00",
  late: "22:00–01:00",
};
export function slotAt(hour: number): VisitSlot {
  return hour >= 22 || hour < 5
    ? "late"
    : hour < 14
      ? "lunch"
      : hour < 18
        ? "afternoon"
        : "evening";
}
