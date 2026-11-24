import { odysseyApiOrigin } from "../src/features/discovery/data/odyssey-api-origin.ts";
import { languages } from "../src/features/discovery/localization.ts";
import type { DiscoveryLanguage } from "../src/features/discovery/model.ts";

type PlaceRow = {
  name?: string;
  lat?: number;
  lng?: number;
  googlePlaceId?: string | null;
};

/** Restrict the public place helpers to the app's hosts and same-origin requests. */
export function isLocalPlaceRequest(request: Request, url: URL) {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  return (
    ["local.hrxlou.com", "localhost", "127.0.0.1", "[::1]"].includes(
      url.hostname,
    ) &&
    (fetchSite === null || fetchSite === "same-origin")
  );
}

/** Validate a positive, safe Odyssey place identifier. */
export function isOdysseyPlaceId(id: string) {
  return /^[1-9]\d{0,15}$/.test(id) && Number.isSafeInteger(Number(id));
}

/** Resolve the supported detail locale, or Korean when the request omits it. */
export function placeLanguage(
  lang: string | null,
): DiscoveryLanguage | undefined {
  if (lang === null) return "ko";
  return languages.find((language) => language === lang);
}

/** Read the place row from the production API, with null for missing places. */
export async function lookupPlaceRow(id: string, signal: AbortSignal) {
  const response = await fetch(
    new URL(`/api/v2/places/${id}`, odysseyApiOrigin),
    {
      signal,
    },
  );
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`Place lookup returned HTTP ${response.status}`);
  const row = (await response.json()) as { success: boolean; data?: PlaceRow };
  return row.success ? (row.data ?? null) : null;
}
