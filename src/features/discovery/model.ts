export type LocalArea = "jongno" | "ikseon" | "insa" | "eulji" | "bukchon";
export type LocalCategory = "food" | "cafe" | "culture";
export type LocalPlace = {
  id: string;
  name: string;
  koreanName: string;
  area: LocalArea;
  category: LocalCategory;
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
};
export type DiscoveryView = "discover" | "map";
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
  kind: "exterior" | "interior" | "menu";
  credit: string;
  sourceUrl: string;
  imageUrl: string;
};
