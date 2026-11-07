import type { SpacePreference } from "./model.ts";
export const spacePreferences = [
  "hanok",
  "courtyard",
  "cozy",
  "retro",
] as const;
export function readSpacePreferences(value: string | null): SpacePreference[] {
  const values = new Set(value?.split(",") ?? []);
  return spacePreferences.filter((id) => values.has(id));
}
