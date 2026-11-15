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

export type PeerComparison = {
  status:
    | "distinct"
    | "no_supported_advantage"
    | "insufficient_evidence"
    | "not_recommended";
  methodVersion: "same_condition_peers_v1";
  unit: "other_candidate_grids";
  expectedPeerAreas: number;
  observedPeerAreas: number;
  feature: "visitor" | "worker_share" | "resident_share" | null;
  texts: ReviewTexts;
  decisionTexts: ReviewTexts;
};

export type PatternSlot = "LUNCH" | "AFTERNOON" | "DINNER" | "LATE_NIGHT";
export type PatternDay = {
  dayGroup: "MON_THU" | "FRI" | "SAT" | "SUN";
  status: "available" | "incomplete" | "insufficient_indicator";
  bars: number[] | null;
  peakSlots: PatternSlot[];
};
export type HistoricalPatterns = {
  sourceYear: number;
  measure: "surrounding_domestic_20s_30s_visitor_indicator";
  normalization: "per_day_maximum_not_comparable_between_places";
  slots: PatternSlot[];
  months: {
    month: number;
    days: PatternDay[];
    representativePeak?: {
      dayGroup: PatternDay["dayGroup"];
      slot: PatternSlot;
    } | null;
  }[];
  sourceArtifact: string;
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
  historicalPatterns?: HistoricalPatterns;
  cases: {
    conditionId: string;
    snapshot: ReviewSnapshot;
    context: PopulationContext | null;
    peerComparison?: PeerComparison;
    engineExactOrderMatch: boolean;
  }[];
};

export type ReviewDataset = {
  schemaVersion: 1;
  comparisonVersion?: "same_condition_peers_v1";
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
