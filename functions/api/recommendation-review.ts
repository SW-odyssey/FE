const REVIEW_ORIGIN =
  "https://local-restaurant-card-review.linedchord4.chatgpt.site";

/** Forward this review screen to its public Sites backend; provider keys stay there. */
export async function onRequestGet({ request }: { request: Request }) {
  const noStore = { "Cache-Control": "private, no-store, max-age=0" };
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
        redirect: "error",
        signal: AbortSignal.timeout(60000),
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: `review_visitor=${cookie}` } : {}),
        },
        ...(request.method === "POST" ? { body: await request.text() } : {}),
      },
    );
    const headers = new Headers({
      ...noStore,
      "Content-Type": "application/json",
    });
    const session = response.headers.get("Set-Cookie");
    if (session) headers.set("Set-Cookie", session);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return Response.json(
      { error: "REVIEW_SITE_UNAVAILABLE" },
      { status: 503, headers: noStore },
    );
  }
}

export const onRequestPost = onRequestGet;
