/** Google Maps source labels and URLs returned with the grounded text. */
export type PlaceSummary = {
  summary: string;
  sources: { name: string; url: string }[];
};
