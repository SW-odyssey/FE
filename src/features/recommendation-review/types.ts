export type ReviewLanguage = "ko" | "en" | "ja";
export type ReviewTexts = Record<ReviewLanguage, string>;

export type ApiRestaurant = {
  id: number;
  name: string;
  category: "food";
  foodType: "korean";
  areaId: string;
  cellId: number;
  googlePlaceId: string;
};

export type ReviewCondition = {
  id: string;
  label: ReviewTexts;
  date: string;
  slot: "lunch" | "dinner";
  density: "any" | "less_busy";
  request: Record<string, string>;
};

export type PopulationContext = {
  evidenceId: string;
  kind: string;
  subjectRef: string;
  texts: ReviewTexts;
  scope: {
    sourceYear: number;
    month: number;
    weekdayGroup: string;
    selectedSlot: string;
  };
  sourceArtifacts: string[];
};

export type ReviewSnapshot = {
  matched: boolean;
  rank: number | null;
  page: number | null;
  positionInPage: number | null;
  complete: boolean;
  checkedCount: number;
  receivedAt: string;
  topItems: ApiRestaurant[];
  pages: { page: number; responseSha256: string; count: number }[];
};

export type RestaurantReview = ApiRestaurant & {
  cases: {
    conditionId: string;
    snapshot: ReviewSnapshot;
    context: PopulationContext | null;
    engineExactOrderMatch: boolean;
  }[];
};

export type ReviewDataset = {
  schemaVersion: 1;
  version: string;
  generatedAt: string;
  sourceYear: number;
  conditions: ReviewCondition[];
  stores: RestaurantReview[];
};

export type LiveCheck = {
  status: "confirmed" | "not_seen_in_checked_pages";
  rank: number | null;
  checkedPages: number[];
  receivedAt: string;
  topItems: ApiRestaurant[];
};

export type Attribution = { name: string; uri?: string };
export type GooglePlaceDisplay = {
  id: string;
  name: string;
  language: ReviewLanguage;
  address?: string;
  phone?: string;
  website?: string;
  mapsUri: string;
  rating?: number;
  ratingCount?: number;
  businessStatus?: string;
  openingHours: string[];
  editorialSummary?: string;
  editorialLanguage?: string;
  attributions: Attribution[];
  photo: {
    url: string;
    authors: Attribution[];
    mapsUri?: string;
    flagContentUri?: string;
  } | null;
  reviews: {
    text: string;
    originalText?: string;
    language?: string;
    originalLanguage?: string;
    rating?: number;
    author: Attribution;
    mapsUri?: string;
    flagContentUri?: string;
  }[];
};
