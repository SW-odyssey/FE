import {
  reviewAccess,
  reviewAccessDenied,
  type ReviewAccessEnv,
} from "../../server/review-access.ts";

const REVIEW_ORIGIN =
  "https://local-restaurant-card-review.linedchord4.chatgpt.site";

/** Why the relay could not return the review site's answer. */
export type ReviewRelayFailure = "timeout" | "redirect" | "network";

/**
 * Forward this review screen to its Sites backend; provider keys stay there.
 * Team-only when Cloudflare Access is configured (#84).
 */
export async function onRequestGet({
  request,
  env = {},
}: {
  request: Request;
  env?: ReviewAccessEnv;
}) {
  const noStore = { "Cache-Control": "private, no-store, max-age=0" };
  if ((await reviewAccess(request, env)) === "denied")
    return reviewAccessDenied();
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: "INVALID_ORIGIN" },
      { status: 403, headers: noStore },
    );
  if (Number(request.headers.get("Content-Length")) > 4096)
    return Response.json(
      { error: "BODY_TOO_LARGE" },
      { status: 413, headers: noStore },
    );
  try {
    const cookie = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)review_visitor=([a-f0-9-]{36})/i)?.[1];
    const response = await fetch(
      `${REVIEW_ORIGIN}/api/recommendation-review${new URL(request.url).searchParams.get("summary") === "1" ? "?summary=1" : ""}`,
      {
        method: request.method,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(60000),
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: `review_visitor=${cookie}` } : {}),
        },
        ...(request.method === "POST" ? { body: await request.text() } : {}),
      },
    );
    if (response.status >= 300 && response.status < 400) {
      // A redirect (for example a bot or login challenge in front of the
      // Sites backend) is not the API answer; report it instead of following.
      return relayFailure("redirect", response.status, noStore);
    }
    const headers = new Headers({
      ...noStore,
      "Content-Type": "application/json",
    });
    const session = response.headers.get("Set-Cookie");
    if (session) headers.set("Set-Cookie", session);
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    return relayFailure(
      error instanceof DOMException && error.name === "TimeoutError"
        ? "timeout"
        : "network",
      undefined,
      noStore,
    );
  }
}

function relayFailure(
  kind: ReviewRelayFailure,
  upstreamStatus: number | undefined,
  headers: Record<string, string>,
) {
  // Logged without cookies or bodies so the Pages logs show where it failed.
  console.warn("Recommendation review relay failed", { kind, upstreamStatus });
  return Response.json(
    { error: "REVIEW_SITE_UNAVAILABLE", reason: kind },
    {
      status: kind === "timeout" ? 504 : kind === "redirect" ? 502 : 503,
      headers,
    },
  );
}

export const onRequestPost = onRequestGet;
