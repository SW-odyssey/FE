import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { onRequestGet } from "../functions/api/recommendation-review.ts";
import { onRequest } from "../functions/review/_middleware.ts";
import {
  resetReviewAccessKeys,
  reviewAccess,
} from "../server/review-access.ts";

beforeEach(resetReviewAccessKeys);

const env = {
  REVIEW_ACCESS_TEAM_DOMAIN: "odyssey.cloudflareaccess.com",
  REVIEW_ACCESS_AUD: "review-aud",
};
const pair = await crypto.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["sign", "verify"],
);
const jwk = {
  ...(await crypto.subtle.exportKey("jwk", pair.publicKey)),
  kid: "k1",
};
const b64 = (value: string | Uint8Array) =>
  Buffer.from(value).toString("base64url");

async function token(claims: Record<string, unknown>, kid = "k1") {
  const head = b64(JSON.stringify({ alg: "RS256", kid }));
  const body = b64(JSON.stringify(claims));
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    pair.privateKey,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64(new Uint8Array(signature))}`;
}
const now = Date.UTC(2026, 10, 27);
const good = {
  aud: ["review-aud"],
  iss: "https://odyssey.cloudflareaccess.com",
  exp: now / 1000 + 600,
  email: "member@example.com",
};
const request = (jwt?: string) =>
  new Request(
    "https://local-odyssey.pages.dev/api/recommendation-review?summary=1",
    {
      headers: jwt ? { "Cf-Access-Jwt-Assertion": jwt } : {},
    },
  );

function mockCerts(
  t: { mock: { method: typeof import("node:test").mock.method } },
  relay?: () => Response | Promise<Response>,
) {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL) => {
    const href = String(url);
    calls.push(new URL(href).host);
    if (href.endsWith("/cdn-cgi/access/certs"))
      return Response.json({ keys: [jwk] });
    if (relay) return relay();
    return Response.json({ feedbackSummary: {} });
  });
  return calls;
}

test("without Access settings the routes stay open as before", async () => {
  assert.equal(await reviewAccess(request(), {}), "open");
});

test("a valid team token is allowed and every other token is denied", async (t) => {
  mockCerts(t);
  assert.equal(
    await reviewAccess(request(await token(good)), env, now),
    "allowed",
  );
  assert.equal(await reviewAccess(request(), env, now), "denied");
  assert.equal(await reviewAccess(request("a.b"), env, now), "denied");
  for (const claims of [
    { ...good, aud: ["other-app"] },
    { ...good, iss: "https://evil.cloudflareaccess.com" },
    { ...good, exp: now / 1000 - 1 },
  ])
    assert.equal(
      await reviewAccess(request(await token(claims)), env, now),
      "denied",
    );
  assert.equal(
    await reviewAccess(request(await token(good, "unknown")), env, now),
    "denied",
  );
  const tampered = (await token(good)).split(".");
  tampered[1] = b64(JSON.stringify({ ...good, email: "attacker@example.com" }));
  assert.equal(
    await reviewAccess(request(tampered.join(".")), env, now),
    "denied",
  );
});

test("the API and the /review pages block a missing token before the relay", async (t) => {
  const calls = mockCerts(t);
  const api = await onRequestGet({ request: request(), env });
  assert.equal(api.status, 403);
  assert.deepEqual(await api.json(), { error: "REVIEW_ACCESS_REQUIRED" });
  let served = false;
  const page = await onRequest({
    request: new Request(
      "https://local-odyssey.pages.dev/review/recommendations/",
    ),
    env,
    next: async () => {
      served = true;
      return new Response("page");
    },
  });
  assert.equal(page.status, 403);
  assert.equal(served, false);
  assert.equal(
    calls.includes("local-restaurant-card-review.linedchord4.chatgpt.site"),
    false,
  );
});

test("relay failures say whether it was a redirect, a timeout or the network", async (t) => {
  let mode: "redirect" | "timeout" | "network" | "ok" = "redirect";
  mockCerts(t, () => {
    if (mode === "redirect")
      return new Response(null, {
        status: 302,
        headers: { Location: "https://challenge.example" },
      });
    if (mode === "timeout") throw new DOMException("timed out", "TimeoutError");
    if (mode === "network") throw new TypeError("fetch failed");
    return Response.json({ feedbackSummary: {} });
  });
  const reason = async () => {
    const response = await onRequestGet({ request: request() });
    return [response.status, (await response.json()).reason];
  };
  assert.deepEqual(await reason(), [502, "redirect"]);
  mode = "timeout";
  assert.deepEqual(await reason(), [504, "timeout"]);
  mode = "network";
  assert.deepEqual(await reason(), [503, "network"]);
  mode = "ok";
  assert.deepEqual(await reason(), [200, undefined]);
});
