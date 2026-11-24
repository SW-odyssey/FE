import assert from "node:assert/strict";
import { test } from "node:test";
import { handlePlaceSummary } from "../server/place-summary.ts";

const key = "server-only-test-key";
const endpoint = "http://localhost/api/place-summary?id=1006";
const place = {
  name: "소살리토",
  lat: 37.57,
  lng: 126.98,
  sinceDate: null,
  googlePlaceId: "ChIJtest",
};
const source = {
  type: "place_citation",
  place_id: "places/ChIJtest",
  name: "Sausalito - Google Maps",
  url: "https://maps.google.com/maps?cid=1006",
};
const nearby = {
  ...source,
  place_id: "ChIJnearby",
  name: "Nearby restaurant - Google Maps",
  url: "https://maps.google.com/maps?cid=1007",
};

function interaction(text: string, annotations = [source]) {
  return Response.json({
    status: "completed",
    steps: [
      { type: "thought", content: [{ type: "text", text: "internal output" }] },
      { type: "model_output", content: [{ type: "text", text, annotations }] },
    ],
  });
}

function request(lang = "ko") {
  return new Request(`${endpoint}&lang=${lang}`, { method: "POST" });
}

test("grounding uses the canonical Korean store and coordinates and preserves the returned text and links", async (t) => {
  const summary = "落ち着いた雰囲気で食事を楽しめます。\n";
  const provider = t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL, init: RequestInit) => {
      if (new URL(url).pathname === "/api/v2/places/1006") {
        assert.equal(new URL(url).search, "");
        assert.equal(new Headers(init.headers).has("X-Goog-Api-Key"), false);
        return Response.json({ success: true, data: place });
      }
      assert.equal(
        new URL(url).href,
        "https://generativelanguage.googleapis.com/v1beta/interactions",
      );
      assert.equal(new Headers(init.headers).get("X-Goog-Api-Key"), key);
      assert.equal(new Headers(init.headers).get("Api-Revision"), "2026-05-20");
      assert.equal(init.redirect, "manual");
      const body = JSON.parse(String(init.body));
      assert.equal(body.store, false);
      assert.equal(body.model, "gemini-3.8-flash");
      assert.deepEqual(body.tools, [
        { type: "google_maps", latitude: 37.57, longitude: 126.98 },
      ]);
      assert.match(body.input, /Respond only in Japanese/);
      assert.match(body.input, /소살리토/);
      assert.doesNotMatch(body.input, /CUSTOM_TEXT/);
      return interaction(summary, [source, nearby]);
    },
  );

  const result = await handlePlaceSummary(
    new Request(`${endpoint}&lang=ja&prompt=CUSTOM_TEXT`, { method: "POST" }),
    key,
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await result.json(), {
    summary,
    sources: [
      { name: source.name, url: source.url },
      { name: nearby.name, url: nearby.url },
    ],
  });
  assert.equal(provider.mock.callCount(), 2);
});

test("no Google Place ID causes no Gemini request, even when a permit record exists", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      success: true,
      data: { ...place, googlePlaceId: null, sinceDate: "2021-08-11" },
    }),
  );

  assert.equal((await handlePlaceSummary(request(), key)).status, 204);
  assert.equal(fetch.mock.callCount(), 1);
});

test("other venues, unlinked, and unsafe citations do not produce a summary", async (t) => {
  for (const annotations of [
    [nearby],
    [],
    [{ ...source, url: "javascript:alert(1)" }],
  ]) {
    const fetch = t.mock.method(globalThis, "fetch", async (url: URL) =>
      new URL(url).hostname === "generativelanguage.googleapis.com"
        ? interaction("조용한 분위기의 음식점이에요.", annotations)
        : Response.json({ success: true, data: place }),
    );
    assert.equal((await handlePlaceSummary(request(), key)).status, 204);
    fetch.mock.restore();
  }
});

test("an answer in the wrong language is suppressed even with a matched citation", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) =>
    new URL(url).hostname === "generativelanguage.googleapis.com"
      ? interaction("조용한 분위기의 음식점이에요.")
      : Response.json({ success: true, data: place }),
  );
  assert.equal((await handlePlaceSummary(request("ja"), key)).status, 204);
});

test("a legacy GET and a cross-site POST never call Gemini", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  const legacy = await handlePlaceSummary(new Request(endpoint), key);
  assert.equal(legacy.status, 405);
  const crossSite = await handlePlaceSummary(
    new Request(endpoint, {
      method: "POST",
      headers: { "Sec-Fetch-Site": "cross-site" },
    }),
    key,
  );
  assert.equal(crossSite.status, 404);
  assert.equal(fetch.mock.callCount(), 0);
});
