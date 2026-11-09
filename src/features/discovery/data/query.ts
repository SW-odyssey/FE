import type { DiscoveryQuery } from "./types";
/**
 * @param input Screen selections, including the preview's optional origin
 * @returns A stable value key even when a caller creates new objects each render
 */
export function discoveryQueryKey(input: DiscoveryQuery): string {
  return JSON.stringify([
    input.area,
    input.category,
    input.query,
    input.slot,
    input.activity,
    input.origin?.lat ?? null,
    input.origin?.lng ?? null,
    [...input.spaces],
    input.visitDate ?? null,
  ]);
}
/**
 * @param input Screen-owned query and selection arrays
 * @returns An independent input for an async request's full lifetime
 */
export function copyDiscoveryQuery(input: DiscoveryQuery): DiscoveryQuery {
  return {
    ...input,
    origin: input.origin ? { ...input.origin } : null,
    spaces: [...input.spaces],
  };
}
