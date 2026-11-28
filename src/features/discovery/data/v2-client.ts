import type { VisitSlot } from "../model.ts";
import type { ApiSlot } from "./api-mapping.ts";
import { odysseyApiOrigin } from "./odyssey-api-origin.ts";

const base =
  process.env.NEXT_PUBLIC_ODYSSEY_API_BASE_URL?.trim() || odysseyApiOrigin;

const apiSlots: Record<VisitSlot, ApiSlot> = {
  lunch: "lunch",
  afternoon: "afternoon",
  evening: "dinner",
  late: "late_night",
};
export const screenSlots: Record<ApiSlot, VisitSlot> = {
  lunch: "lunch",
  afternoon: "afternoon",
  dinner: "evening",
  late_night: "late",
};
const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type ApiWeekday = (typeof weekdays)[number];

/** Return the API weekday and slot for an applied Seoul calendar date. */
export function v2Time(date: string, slot: VisitSlot) {
  const weekday = weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()];
  if (!weekday) throw new Error("Invalid visit date");
  return { weekday, slot: apiSlots[slot] };
}

export class V2RequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Odyssey API returned ${status}`);
    this.status = status;
  }
}

/** Read the data envelope for a v2 GET request. */
export async function getV2Data<T>(
  resource: string,
  signal?: AbortSignal,
  search?: URLSearchParams,
): Promise<T> {
  const url = new URL(`/api/v2/${resource}`, base);
  if (search) url.search = search.toString();
  const response = await fetch(url, { signal });
  if (!response.ok) throw new V2RequestError(response.status);
  const payload = (await response.json()) as
    { success: true; data: T } | { success: false; data: null };
  if (!payload.success || payload.data == null)
    throw new Error("Odyssey API did not return data");
  return payload.data;
}
