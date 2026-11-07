import { distanceMeters } from "../../../map/geometry.ts";
import type {
  AreaActivity,
  Coordinate,
  DiscoveryArea,
  DiscoveryCategory,
  LocalPlace,
  SpacePreference,
  VisitSlot,
} from "../../model.ts";
export function filterLocalPlaces(
  places: LocalPlace[],
  area: DiscoveryArea,
  category: DiscoveryCategory,
  query: string,
): LocalPlace[] {
  const normalized = query.trim().toLocaleLowerCase();
  return places.filter(
    (place) =>
      (area === "all" ||
        place.area === area ||
        (area === "jongno" && place.area !== "eulji")) &&
      (category === "all" || place.category === category) &&
      (!normalized ||
        `${place.name} ${place.koreanName} ${place.address} ${place.descriptionEn} ${place.descriptionKo}`
          .toLocaleLowerCase()
          .includes(normalized)),
  );
}
// Editorial UI-preview tags, based on the launch venue descriptions and photos.
export const placeSpaces: Record<string, readonly SpacePreference[]> = {
  cheongsudang: ["hanok", "courtyard"],
  seoulcoffee: ["hanok", "cozy"],
  oncheonjip: ["courtyard"],
  hanyakbang: ["retro", "cozy"],
  osulloc: ["cozy"],
  imun: ["retro"],
  layered: ["hanok", "cozy"],
  songam: ["hanok", "retro"],
  gowundon: ["hanok", "courtyard"],
  highwaist: ["hanok", "cozy"],
  chatteul: ["hanok", "courtyard", "cozy"],
  beautifultea: ["hanok", "cozy"],
  sujebi: ["retro"],
  joseonok: ["retro"],
  dalmaji: ["courtyard"],
  sammijung: ["courtyard", "retro"],
  banjjak: ["cozy"],
  soseonjae: ["hanok", "cozy"],
  hanaro: ["retro"],
  rainreport: ["hanok", "courtyard"],
};
// These are explicit interaction fixtures, not measured footfall or opening hours.
const scenarios: Record<VisitSlot, string[]> = {
  lunch: [
    "imun",
    "oncheonjip",
    "songam",
    "sujebi",
    "hanaro",
    "soseonjae",
    "joseonok",
    "sammijung",
    "seoulcoffee",
    "layered",
    "highwaist",
    "rainreport",
    "beautifultea",
    "chatteul",
    "banjjak",
  ],
  afternoon: [
    "cheongsudang",
    "seoulcoffee",
    "oncheonjip",
    "osulloc",
    "layered",
    "hanyakbang",
    "highwaist",
    "rainreport",
    "chatteul",
    "beautifultea",
    "banjjak",
    "sujebi",
    "imun",
    "songam",
    "sammijung",
    "dalmaji",
    "gowundon",
  ],
  evening: [
    "oncheonjip",
    "imun",
    "songam",
    "gowundon",
    "dalmaji",
    "sammijung",
    "joseonok",
    "sujebi",
    "hanaro",
    "soseonjae",
    "cheongsudang",
    "seoulcoffee",
    "layered",
    "highwaist",
    "osulloc",
    "beautifultea",
    "rainreport",
    "banjjak",
  ],
  late: ["dalmaji", "banjjak", "gowundon"],
};
const activityScenarios: Record<AreaActivity, string[]> = {
  any: [],
  quiet: [
    "osulloc",
    "cheongsudang",
    "hanyakbang",
    "chatteul",
    "beautifultea",
    "songam",
    "imun",
    "soseonjae",
    "hanaro",
    "banjjak",
  ],
  lively: [
    "layered",
    "seoulcoffee",
    "oncheonjip",
    "highwaist",
    "rainreport",
    "gowundon",
    "dalmaji",
    "sammijung",
    "sujebi",
    "joseonok",
  ],
};
export function recommendPlaces(
  places: LocalPlace[],
  slot: VisitSlot,
  activity: AreaActivity,
  origin: Coordinate | null,
  spaces: readonly SpacePreference[] = [],
): LocalPlace[] {
  return places
    .filter(
      (p) =>
        p.category !== "culture" &&
        scenarios[slot].includes(p.id) &&
        (activity === "any" || activityScenarios[activity].includes(p.id)) &&
        (!spaces.length ||
          spaces.some((tag) => placeSpaces[p.id]?.includes(tag))),
    )
    .map((p) => ({
      p,
      score:
        (activity === "any"
          ? scenarios[slot].indexOf(p.id)
          : activityScenarios[activity].indexOf(p.id)) +
        (origin ? distanceMeters(origin, p) / 500 : 0),
    }))
    .sort((a, b) => a.score - b.score)
    .map((x) => x.p);
}
