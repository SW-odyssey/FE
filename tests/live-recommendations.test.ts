import assert from "node:assert/strict";
import { test } from "node:test";
import { createLiveDiscoveryDataSource } from "../src/features/discovery/data/live-recommendations.ts";
import type { DiscoveryQuery } from "../src/features/discovery/data/types.ts";
import { getLiveVisitPattern } from "../src/features/discovery/data/visit-pattern.ts";

const query: DiscoveryQuery = {
  area: "eulji",
  category: "all",
  query: "",
  slot: "evening",
  visitDate: "2026-11-27",
  activity: "any",
  spaces: [],
  origin: null,
};
const place = {
  id: 1557,
  name: "추천 장소",
  cellId: "81655936",
  kind: "korean",
  lat: 37.56,
  lng: 126.99,
  googlePlaceId: "ChIJtest",
};

test("the live source keeps backend order and shares the published dataset across cell requests", async (t) => {
  const calls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    calls.push(url);
    const data = url.pathname.endsWith("/meta")
      ? { datasets: [{ id: "public-latest" }] }
      : url.pathname.endsWith("/recommendations")
        ? { total: 2, items: [place, { ...place, id: 141 }] }
        : url.pathname.endsWith("/visit-pattern") &&
            url.searchParams.get("weekday") === "sat"
          ? { status: "NO_DISTINCT_PEAK", graph: null }
          : url.pathname.endsWith("/visit-pattern")
            ? {
                status: "AVAILABLE",
                graph: {
                  bars: [
                    { slot: "lunch", relativeHeight: 60 },
                    { slot: "afternoon", relativeHeight: 80 },
                    { slot: "dinner", relativeHeight: 100 },
                    { slot: "late_night", relativeHeight: 20 },
                  ],
                },
              }
            : place;
    return Response.json({ success: true, data });
  });
  const source = createLiveDiscoveryDataSource();
  const found = await source.query(query);
  assert.deepEqual(
    found.items.map(({ id }) => id),
    ["1557", "141"],
  );
  assert.equal(calls[1]?.searchParams.get("weekday"), "fri");
  assert.equal(calls[1]?.searchParams.get("slot"), "dinner");
  assert.equal(calls.length, 2);
  for (const url of calls.slice(1))
    assert.equal(url.searchParams.get("datasetId"), "public-latest");
  const detail = await source.getPlace("1557", { query });
  const pattern = detail?.visitPattern;
  assert.deepEqual(pattern, {
    provenance: "live",
    cellId: "81655936",
    datasetId: "public-latest",
    weekday: "fri",
  });
  assert.ok(pattern?.provenance === "live");
  assert.deepEqual(await getLiveVisitPattern(pattern), {
    lunch: 60,
    afternoon: 80,
    evening: 100,
    late: 20,
  });
  assert.equal(calls.filter((url) => url.pathname.endsWith("/meta")).length, 1);
  assert.equal(calls.at(-1)?.searchParams.get("datasetId"), "public-latest");
  assert.equal(await getLiveVisitPattern({ ...pattern, weekday: "sat" }), null);
  assert.equal(calls.at(-1)?.searchParams.get("weekday"), "sat");
});

test("empty recommendations and missing place links are handled without demo data", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async (url: URL) =>
    url.pathname.endsWith("/places/1557")
      ? new Response(null, { status: 404 })
      : Response.json({
          success: true,
          data: url.pathname.endsWith("/meta")
            ? { datasets: [{ id: "public-latest" }] }
            : { items: [], total: 0 },
        }),
  );
  const source = createLiveDiscoveryDataSource();
  assert.deepEqual(await source.query(query), { items: [], total: 0 });
  assert.equal(await source.getPlace("1557", { query }), null);
  assert.equal(await source.getPlace("old-preview-slug", { query }), null);
  assert.equal(fetch.mock.callCount(), 3);
});
