/** A server area ID from GET /api/v2/meta `areas[].id`, such as `euljiro`. */
export type AreaId = string;
export type LocalArea = AreaId;
export type CoursePlaceKind =
  "korean" | "cafe" | "shop" | "play" | "bar" | "other";
export type LocalCategory = "food" | "cafe" | "culture";
export type LocalPlace = {
  id: string;
  name: string;
  koreanName: string;
  area: LocalArea | null;
  category: LocalCategory;
  courseKind?: CoursePlaceKind;
  cellId?: string;
  sinceDate?: string;
  image: string;
  descriptionEn: string;
  descriptionKo: string;
  summaryEn?: string;
  summaryKo?: string;
  address: string;
  lat: number;
  lng: number;
  sourceUrl: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  googlePlaceId?: string;
};
export type DiscoveryView = "discover" | "course" | "map";
export type DiscoveryLanguage = "en" | "ko" | "ja" | "zh";
export type DiscoveryArea = "all" | LocalArea;
export type DiscoveryCategory = "all" | LocalCategory;
export type VisitSlot = "lunch" | "afternoon" | "evening" | "late";
export type AreaActivity = "any" | "quiet" | "lively";
export type SpacePreference = "hanok" | "courtyard" | "cozy" | "retro";
export type Coordinate = {
  lat: number;
  lng: number;
};

export type PlacePhoto = {
  src: string;
  kind?: "exterior" | "interior" | "menu";
  authors?: { name: string; uri?: string }[];
  credit: string;
  sourceUrl: string;
  imageUrl: string;
};
