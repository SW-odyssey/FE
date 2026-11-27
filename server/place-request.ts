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

type Lookup = { expires: number; row: Promise<PlaceRow | null> };
/** Short enough for store edits to show up quickly, long enough for one visit. */
export const placeLookupTtlMs = 60_000;
const maxLookups = 500;
const lookups = new Map<string, Lookup>();

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

function edgeCache(): EdgeCache | undefined {
  // Cloudflare's per-location cache, shared by Pages Function instances.
  // Node (the Next dev server) has no `caches.default`.
  return (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
}

async function fetchPlaceRow(url: URL): Promise<PlaceRow | null> {
  const cache = edgeCache();
  const key = new Request(url.href);
  let response = await cache?.match(key).catch(() => undefined);
  if (!response) {
    const upstream = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });
    if (upstream.status === 404) return null;
    if (!upstream.ok)
      throw new Error(`Place lookup returned HTTP ${upstream.status}`);
    response = new Response(await upstream.text(), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `max-age=${placeLookupTtlMs / 1000}`,
      },
    });
    await cache?.put(key, response.clone()).catch(() => undefined);
  }
  const row = (await response.json()) as { success: boolean; data?: PlaceRow };
  return row.success ? (row.data ?? null) : null;
}

/**
 * Read the basic place row (name, coordinates, Google Place ID) from this
 * environment's API, with null for a missing place.
 *
 * Concurrent and repeated lookups of the same API origin and ID within
 * {@link placeLookupTtlMs} share one request in this instance, and the
 * Cloudflare cache shares it across instances in a location (#86). The row
 * has no language, so photos and summaries in any language share it. Google
 * and Gemini responses are never cached here.
 *
 * @param signal Cancels only this caller's wait; the shared lookup keeps its
 * own timeout for the other caller
 */
export function lookupPlaceRow(
  id: string,
  signal: AbortSignal,
  apiOrigin: string = odysseyApiOrigin,
  now = Date.now(),
): Promise<PlaceRow | null> {
  const key = `${apiOrigin}|${id}`;
  let lookup = lookups.get(key);
  if (!lookup || lookup.expires <= now) {
    lookups.delete(key);
    if (lookups.size >= maxLookups) {
      const oldest = lookups.keys().next().value;
      if (oldest !== undefined) lookups.delete(oldest);
    }
    const row = fetchPlaceRow(new URL(`/api/v2/places/${id}`, apiOrigin));
    const entry = { expires: now + placeLookupTtlMs, row };
    // A failure is not reused; the next caller asks again.
    row.catch(() => {
      if (lookups.get(key) === entry) lookups.delete(key);
    });
    lookups.set(key, entry);
    lookup = entry;
  }
  return abortable(lookup.row, signal);
}

/** Clear the instance lookups; tests only. */
export function resetPlaceLookups(): void {
  lookups.clear();
}
