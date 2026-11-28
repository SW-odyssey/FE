import {
  odysseyApiOrigin,
  parseApiOrigin,
} from "../src/features/discovery/data/odyssey-api-origin.ts";
import { languages } from "../src/features/discovery/localization.ts";
import type { DiscoveryLanguage } from "../src/features/discovery/model.ts";

type PlaceRow = {
  name?: string;
  lat?: number;
  lng?: number;
  googlePlaceId?: string | null;
};

/**
 * Server settings shared by the Next dev server and Cloudflare Pages
 * Functions (#82). Both read the same variable names from their runtime env.
 */
export type PlaceServerEnv = {
  /** Server-side Odyssey API base URL for this environment. */
  ODYSSEY_API_BASE_URL?: string;
  /** The browser build value, used when the server value is not set. */
  NEXT_PUBLIC_ODYSSEY_API_BASE_URL?: string;
  /** Comma-separated hosts, `*.example.pages.dev` allowed for previews. */
  PLACE_ALLOWED_HOSTS?: string;
};

export type PlaceServerConfig = {
  apiOrigin: string;
  allowedHosts: readonly string[];
};

/** Hosts served by default: production and local development. */
export const defaultAllowedHosts = [
  "local.hrxlou.com",
  "localhost",
  "127.0.0.1",
  "[::1]",
] as const;

/** A configured value that is present but unusable. */
export class PlaceConfigError extends Error {}

/**
 * @param env Runtime variables (`process.env` or the Pages `env`)
 * @returns The API origin and allowed hosts. With no API variable it uses
 * production, the same default as the browser build.
 * @throws PlaceConfigError when a variable is set but invalid
 */
export function placeServerConfig(env: PlaceServerEnv = {}): PlaceServerConfig {
  const configured =
    env.ODYSSEY_API_BASE_URL?.trim() ||
    env.NEXT_PUBLIC_ODYSSEY_API_BASE_URL?.trim();
  const apiOrigin = configured ? parseApiOrigin(configured) : odysseyApiOrigin;
  if (!apiOrigin)
    throw new PlaceConfigError("ODYSSEY_API_BASE_URL is not a valid https URL");
  const hosts = env.PLACE_ALLOWED_HOSTS?.split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (hosts?.some((host) => !/^(\*\.)?[a-z0-9.-]+$|^\[::1\]$/.test(host)))
    throw new PlaceConfigError("PLACE_ALLOWED_HOSTS has an invalid host");
  return {
    apiOrigin,
    allowedHosts: hosts?.length ? hosts : defaultAllowedHosts,
  };
}

/**
 * @param env Runtime variables
 * @returns The config, or null after logging which variable is invalid; the
 * handlers then answer 500 instead of using another environment's API.
 */
export function readPlaceConfig(
  env?: PlaceServerEnv,
): PlaceServerConfig | null {
  try {
    return placeServerConfig(env);
  } catch (error) {
    console.error(
      "Place helper misconfigured",
      error instanceof PlaceConfigError ? error.message : "Unknown error",
    );
    return null;
  }
}

function hostAllowed(hostname: string, allowed: readonly string[]) {
  const host = hostname.toLowerCase();
  return allowed.some((entry) =>
    entry.startsWith("*.")
      ? host.endsWith(entry.slice(1)) && host.length > entry.length - 1
      : host === entry,
  );
}

/** Restrict the public place helpers to the app's hosts and same-origin requests. */
export function isLocalPlaceRequest(
  request: Request,
  url: URL,
  allowedHosts: readonly string[] = defaultAllowedHosts,
) {
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  return (
    hostAllowed(url.hostname, allowedHosts) &&
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

/** Read the place row from this environment's API, with null for missing places. */
export async function lookupPlaceRow(
  id: string,
  signal: AbortSignal,
  apiOrigin: string = odysseyApiOrigin,
) {
  const response = await fetch(new URL(`/api/v2/places/${id}`, apiOrigin), {
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`Place lookup returned HTTP ${response.status}`);
  const row = (await response.json()) as { success: boolean; data?: PlaceRow };
  return row.success ? (row.data ?? null) : null;
}
