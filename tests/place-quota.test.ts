import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { handlePlacePhotos } from "../server/place-photos.ts";
import {
  limitPlaceRequest,
  placeQuotaRules,
  resetPlaceQuota,
  type RateLimitBinding,
} from "../server/place-quota.ts";
import { handlePlaceSummary } from "../server/place-summary.ts";

beforeEach(resetPlaceQuota);

const key = "server-only-test-key";
const place = {
  name: "소살리토",
  lat: 37.57,
  lng: 126.98,
  googlePlaceId: "ChIJtest",
};

function provider(t: {
  mock: { method: typeof import("node:test").mock.method };
}) {
  const calls = { odyssey: 0, google: 0, gemini: 0 };
  t.mock.method(globalThis, "fetch", async (url: string | URL) => {
    const href = String(url);
    if (href.includes("/api/v2/places/")) {
      calls.odyssey += 1;
      return Response.json({ success: true, data: place });
    }
    if (href.includes("generativelanguage")) {
      calls.gemini += 1;
      return new Response(null, { status: 500 });
    }
    calls.google += 1;
    return Response.json({ photos: [] });
  });
  return calls;
}

const summary = (ip = "203.0.113.7") =>
  new Request("http://localhost/api/place-summary?id=1006&lang=ko", {
    method: "POST",
    headers: { "CF-Connecting-IP": ip },
  });
const photos = (ip = "203.0.113.7") =>
  new Request("http://localhost/api/place-photos?id=1006&variant=thumbnail", {
    headers: { "CF-Connecting-IP": ip },
  });

test("summary requests over the client limit get 429 before any paid call", async (t) => {
  const calls = provider(t);
  const { perClient } = placeQuotaRules.summary;
  for (let i = 0; i < perClient; i += 1)
    assert.notEqual((await handlePlaceSummary(summary(), key)).status, 429);
  const gemini = calls.gemini;
  const odyssey = calls.odyssey;
  const limited = await handlePlaceSummary(summary(), key);
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("Retry-After")) >= 1);
  assert.equal(calls.gemini, gemini, "no Gemini call after the limit");
  assert.equal(calls.odyssey, odyssey, "no place lookup after the limit");
  // Another visitor is not blocked by the first one's limit.
  assert.notEqual(
    (await handlePlaceSummary(summary("198.51.100.4"), key)).status,
    429,
  );
});

test("photo requests without Sec-Fetch-Site are still limited", async (t) => {
  const calls = provider(t);
  const { perClient } = placeQuotaRules.photos;
  for (let i = 0; i < perClient; i += 1) await handlePlacePhotos(photos(), key);
  const google = calls.google;
  const limited = await handlePlacePhotos(photos(), key);
  assert.equal(limited.status, 429);
  assert.equal(calls.google, google);
});

test("the instance cap stops many visitors and the window resets", async () => {
  const { perInstance, windowMs } = placeQuotaRules.summary;
  const now = 1_000_000;
  for (let i = 0; i < perInstance; i += 1)
    assert.equal(
      await limitPlaceRequest(
        summary(`10.0.0.${i}`),
        "summary",
        undefined,
        now,
      ),
      null,
    );
  const over = await limitPlaceRequest(
    summary("10.0.1.1"),
    "summary",
    undefined,
    now,
  );
  assert.equal(over?.status, 429);
  assert.equal(
    await limitPlaceRequest(
      summary("10.0.1.1"),
      "summary",
      undefined,
      now + windowMs,
    ),
    null,
  );
});

test("concurrent requests do not slip past the client limit", async () => {
  const { perClient } = placeQuotaRules.summary;
  const results = await Promise.all(
    Array.from({ length: perClient + 5 }, () =>
      limitPlaceRequest(summary(), "summary", undefined, 5_000_000),
    ),
  );
  assert.equal(results.filter((result) => result?.status === 429).length, 5);
});

test("a shared Cloudflare binding decides first and a broken one falls back", async () => {
  const keys: string[] = [];
  const denying: RateLimitBinding = {
    async limit({ key }) {
      keys.push(key);
      return { success: false };
    },
  };
  const denied = await limitPlaceRequest(summary(), "summary", denying);
  assert.equal(denied?.status, 429);
  assert.deepEqual(keys, ["summary:203.0.113.7"]);
  const broken: RateLimitBinding = {
    async limit() {
      throw new Error("binding unavailable");
    },
  };
  assert.equal(await limitPlaceRequest(summary(), "summary", broken), null);
});
