/** Server slot names used by every v2 endpoint. */
export type ApiSlot = "lunch" | "afternoon" | "dinner" | "late_night";

/**
 * @param id Numeric ID returned by the server
 * @returns Its stable UI string representation, preserving the current screen model
 */
export function mapApiIdToDiscovery(id: number): string {
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new TypeError("API ID must be a positive safe integer");
  return String(id);
}
