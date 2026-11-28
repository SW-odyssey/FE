/**
 * Team-only access for the recommendation review page and its API (#84).
 *
 * Cloudflare Access signs every request it lets through with the
 * `Cf-Access-Jwt-Assertion` header. Checking that token in the Pages
 * Function closes routes that Access does not cover, such as `*.pages.dev`.
 * The check runs only when both variables are set; until then the routes
 * behave as before and the gap is recorded in #84.
 */

export type ReviewAccessEnv = {
  /** e.g. `odyssey.cloudflareaccess.com` */
  REVIEW_ACCESS_TEAM_DOMAIN?: string;
  /** The Application Audience (AUD) tag of the Access application. */
  REVIEW_ACCESS_AUD?: string;
};

type Jwk = JsonWebKey & { kid?: string };
type Keys = { expires: number; keys: Map<string, CryptoKey> };
const keyCache = new Map<string, Keys>();
const keyTtlMs = 10 * 60_000;

function base64UrlBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlJson(value: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value)));
}

async function signingKeys(teamDomain: string, now: number) {
  const cached = keyCache.get(teamDomain);
  if (cached && cached.expires > now) return cached.keys;
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Access certs returned ${response.status}`);
  const { keys = [] } = (await response.json()) as { keys?: Jwk[] };
  const imported = new Map<string, CryptoKey>();
  for (const jwk of keys)
    if (jwk.kid && jwk.kty === "RSA")
      imported.set(
        jwk.kid,
        await crypto.subtle.importKey(
          "jwk",
          jwk,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["verify"],
        ),
      );
  keyCache.set(teamDomain, { expires: now + keyTtlMs, keys: imported });
  return imported;
}

/**
 * @param request Incoming request
 * @param env Access settings
 * @param now Clock in ms, for tests
 * @returns "open" when Access is not configured, "allowed" for a valid team
 * token, "denied" otherwise
 */
export async function reviewAccess(
  request: Request,
  env: ReviewAccessEnv = {},
  now = Date.now(),
): Promise<"open" | "allowed" | "denied"> {
  const teamDomain = env.REVIEW_ACCESS_TEAM_DOMAIN?.trim();
  const audience = env.REVIEW_ACCESS_AUD?.trim();
  if (!teamDomain || !audience) return "open";
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  const parts = token?.split(".");
  if (!parts || parts.length !== 3) return "denied";
  try {
    const header = base64UrlJson(parts[0]!);
    const claims = base64UrlJson(parts[1]!);
    if (header.alg !== "RS256" || typeof header.kid !== "string")
      return "denied";
    const key = (await signingKeys(teamDomain, now)).get(header.kid);
    if (!key) return "denied";
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlBytes(parts[2]!),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    const seconds = now / 1000;
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    return valid &&
      aud.includes(audience) &&
      claims.iss === `https://${teamDomain}` &&
      typeof claims.exp === "number" &&
      claims.exp > seconds &&
      (typeof claims.nbf !== "number" || claims.nbf <= seconds + 60)
      ? "allowed"
      : "denied";
  } catch {
    return "denied";
  }
}

/** The response for a request without a valid team token. */
export function reviewAccessDenied(): Response {
  return Response.json(
    { error: "REVIEW_ACCESS_REQUIRED" },
    {
      status: 403,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}

/** Clear the cached Access keys; tests only. */
export function resetReviewAccessKeys(): void {
  keyCache.clear();
}
