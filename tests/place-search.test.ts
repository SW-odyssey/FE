import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createLiveDiscoveryDataSource } from "../src/features/discovery/data/live-recommendations.ts";
import {
  placeSearchTerm,
  searchPlaces,
} from "../src/features/discovery/data/place-search.ts";
import { invalidateServiceMeta } from "../src/features/discovery/data/service-meta.ts";
import type { DiscoveryQuery } from "../src/features/discovery/data/types.ts";

beforeEach(invalidateServiceMeta);

// Server order from GET /api/v2/place-search (BE #98): exact, prefix, contains.
const items = [
  {
    id: 129,
    name: "原糖ポテト",
    kind: "korean",
    lat: 37.56,
    lng: 126.98,
    cellId: "1",
    sinceDate: null,
    googlePlaceId: null,
    areaId: "myeongdong",
  },
  {
    id: 2537,
    name: "サポートゲームゾーン",
    kind: "play",
    lat: 37.57,
    lng: 126.99,
    cellId: "2",
    sinceDate: null,
    googlePlaceId: null,
    areaId: "jongno",
  },
  {
    id: 41,
    name: "カフェ",
    kind: "cafe",
    lat: 37.57,
    lng: 126.99,
    cellId: "3",
    sinceDate: null,
    googlePlaceId: "g",
    areaId: "ikseon",
  },
  {
    id: 7,
    name: "居酒屋",
    kind: "bar",
    lat: 37.57,
    lng: 126.99,
    cellId: "4",
    sinceDate: null,
    googlePlaceId: null,
    areaId: "euljiro",
  },
];
const query: DiscoveryQuery = {
  area: "euljiro",
  category: "all",
  query: "  감자탕  ",
  slot: "evening",
  visitDate: "2026-11-27",
  activity: "any",
  spaces: [],
  origin: { lat: 37.5, lng: 126.9 },
  language: "ja",
};

test("search terms are trimmed, capped at 80 characters and blank input sends nothing", () => {
  assert.equal(placeSearchTerm("  coffee  "), "coffee");
  assert.equal(placeSearchTerm(" \n "), "");
  assert.equal(placeSearchTerm("가".repeat(90)).length, 80);
});

test("the server search keeps its order and IDs and passes q, lang and limit", async (t) => {
  const calls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    calls.push(url);
    return Response.json({ success: true, data: { items } });
  });
  const found = await searchPlaces("감자탕", "ja", 6);
  assert.equal(calls[0]?.pathname, "/api/v2/place-search");
  assert.deepEqual(Object.fromEntries(calls[0]!.searchParams), {
    q: "감자탕",
    limit: "6",
    lang: "ja",
  });
  assert.deepEqual(
    found.map(({ id, area }) => [id, area]),
    [
      ["129", "myeongdong"],
      ["2537", "jongno"],
      ["41", "ikseon"],
      ["7", "euljiro"],
    ],
  );
});

test("the list search ignores area, time and location and only the tabs narrow it", async (t) => {
  const calls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    calls.push(url);
    return Response.json({ success: true, data: { items } });
  });
  const source = createLiveDiscoveryDataSource();
  const all = await source.query(query);
  assert.equal(
    calls.length,
    1,
    "no meta, nearby or area request for a name search",
  );
  assert.deepEqual(Object.fromEntries(calls[0]!.searchParams), {
    q: "감자탕",
    limit: "30",
    lang: "ja",
  });
  assert.deepEqual(
    all.items.map(({ id }) => id),
    ["129", "2537", "41", "7"],
  );
  assert.equal(all.total, 4);
  const cafes = await source.query({ ...query, category: "cafe" });
  assert.deepEqual(
    cafes.items.map(({ id }) => id),
    ["41"],
  );
  const food = await source.query({ ...query, category: "food" });
  assert.deepEqual(
    food.items.map(({ id }) => id),
    ["129", "7"],
  );
});

test("an aborted search rejects so a late response cannot replace newer results", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: URL, init?: RequestInit) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    init?.signal?.throwIfAborted();
    return Response.json({ success: true, data: { items } });
  });
  const controller = new AbortController();
  const pending = searchPlaces("감자", "ko", 6, controller.signal);
  controller.abort();
  await assert.rejects(pending);
});
