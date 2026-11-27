import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createLiveDiscoveryDataSource } from "../src/features/discovery/data/live-recommendations.ts";
import { invalidateServiceMeta } from "../src/features/discovery/data/service-meta.ts";
import type { DiscoveryQuery } from "../src/features/discovery/data/types.ts";
import { getLiveVisitPattern } from "../src/features/discovery/data/visit-pattern.ts";

const query: DiscoveryQuery = {
  area: "euljiro",
  language: "en",
  category: "all",
  query: "",
  slot: "evening",
  visitDate: "2026-11-27",
  activity: "any",
  spaces: [],
  origin: null,
};
const meta = {
  defaultDatasetId: "public-latest",
  datasets: [
    { id: "older", referenceMonth: "2025-11" },
    { id: "public-latest", referenceMonth: "2025-12" },
  ],
  areas: [
    {
      id: "euljiro",
      name: "을지로",
      centerLat: 37.565748,
      centerLng: 126.99013,
    },
  ],
};
beforeEach(invalidateServiceMeta);
const place = {
  id: 1557,
  name: "Recommended Place",
  cellId: "81655936",
  kind: "korean",
  lat: 37.56,
  lng: 126.99,
  googlePlaceId: "ChIJtest",
};

test("nearby recommendations include bars and share the published dataset", async (t) => {
  const calls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    calls.push(url);
    const data = url.pathname.endsWith("/meta")
      ? meta
      : url.pathname.endsWith("/recommendations")
        ? {
            total: 6,
            items: [
              { ...place, id: 101, kind: "shop" },
              place,
              { ...place, id: 102, kind: "bar" },
              { ...place, id: 141, kind: "cafe" },
              { ...place, id: 103, kind: "play" },
              { ...place, id: 142, kind: "other" },
            ],
          }
        : url.pathname.endsWith("/visit-pattern") &&
            url.searchParams.get("weekday") === "sat"
          ? { status: "NO_DISTINCT_PEAK", graph: null }
          : url.pathname.endsWith("/visit-pattern")
            ? {
                status: "AVAILABLE",
                graph: {
                  highlightSlot: "dinner",
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
  // A map search or device location sends coordinates to the nearby route.
  const nearby = { ...query, origin: { lat: 37.565748, lng: 126.99013 } };
  const found = await source.query(nearby);
  assert.deepEqual(
    found.items.map(({ id }) => id),
    ["1557", "102", "141", "142"],
  );
  assert.equal(found.total, 4);
  assert.equal(calls[1]?.searchParams.get("weekday"), "fri");
  assert.equal(calls[1]?.searchParams.get("slot"), "dinner");
  assert.equal(calls[1]?.searchParams.get("lang"), "en");
  assert.equal(calls[1]?.searchParams.get("lat"), "37.565748");
  assert.equal(calls[1]?.searchParams.get("lng"), "126.99013");
  assert.equal(found.items[0]?.name, "Recommended Place");
  assert.equal(calls.length, 2);
  for (const url of calls.slice(1))
    assert.equal(url.searchParams.get("datasetId"), "public-latest");
  const detail = await source.getPlace("1557", { query });
  assert.equal(calls[2]?.searchParams.get("lang"), "en");
  assert.equal(detail?.place.name, found.items[0]?.name);
  const pattern = detail?.visitPattern;
  assert.deepEqual(pattern, {
    provenance: "live",
    cellId: "81655936",
    datasetId: "public-latest",
    referenceMonth: "2025-12",
    weekday: "fri",
  });
  assert.ok(pattern?.provenance === "live");
  assert.deepEqual(await getLiveVisitPattern(pattern), {
    heights: { lunch: 60, afternoon: 80, evening: 100, late: 20 },
    highlightSlot: "evening",
  });
  assert.equal(calls.filter((url) => url.pathname.endsWith("/meta")).length, 1);
  assert.equal(calls.at(-1)?.searchParams.get("datasetId"), "public-latest");
  assert.equal(await getLiveVisitPattern({ ...pattern, weekday: "sat" }), null);
  assert.equal(calls.at(-1)?.searchParams.get("weekday"), "sat");
  const search = await source.query({ ...query, query: "Recommended Place" });
  assert.equal(calls.at(-1)?.searchParams.get("q"), "Recommended Place");
  assert.deepEqual(
    search.items.map(({ id }) => id),
    ["1557", "141", "142"],
  );
});

test("empty recommendations and missing place links are handled without demo data", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async (url: URL) =>
    url.pathname.endsWith("/places/1557")
      ? new Response(null, { status: 404 })
      : Response.json({
          success: true,
          data: url.pathname.endsWith("/meta")
            ? meta
            : { items: [], total: 0, page: 0, hasNext: false },
        }),
  );
  const source = createLiveDiscoveryDataSource();
  assert.deepEqual(await source.query(query), {
    items: [],
    total: 0,
    page: 0,
    hasNext: false,
  });
  assert.equal(await source.getPlace("1557", { query }), null);
  assert.equal(await source.getPlace("old-preview-slug", { query }), null);
  assert.equal(fetch.mock.callCount(), 3);
});

test("방문 패턴은 동률과 일부 자료 누락의 막대를 보존한다", async (t) => {
  const slots = ["lunch", "afternoon", "dinner", "late_night"];
  const payloads = [
    { status: "NO_DISTINCT_PEAK", values: [100, 100, 100, 100] },
    { status: "NO_DISTINCT_PEAK", values: [80, 100, 95, 50] },
    { status: "INCOMPLETE_TIME_SLOTS", values: [null, 100, 0, null] },
  ];
  let index = 0;
  t.mock.method(globalThis, "fetch", async () => {
    const { status, values } = payloads[index++];
    return Response.json({
      success: true,
      data: {
        status,
        graph: {
          highlightSlot: null,
          bars: slots.map((slot, i) => ({ slot, relativeHeight: values[i] })),
        },
      },
    });
  });
  const input = {
    datasetId: "public-latest",
    cellId: "81655936",
    weekday: "fri",
  } as const;
  assert.deepEqual(await getLiveVisitPattern(input), {
    heights: { lunch: 100, afternoon: 100, evening: 100, late: 100 },
    highlightSlot: null,
  });
  assert.deepEqual(await getLiveVisitPattern(input), {
    heights: { lunch: 80, afternoon: 100, evening: 95, late: 50 },
    highlightSlot: null,
  });
  assert.deepEqual(await getLiveVisitPattern(input), {
    heights: { lunch: null, afternoon: 100, evening: 0, late: null },
    highlightSlot: null,
  });
});

test("관측한 막대가 없는 방문 패턴은 그래프를 만들지 않는다", async (t) => {
  const inputs = ["INCOMPLETE_TIME_SLOTS", "NO_POSITIVE_VISITS"];
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      success: true,
      data: { status: inputs.shift(), graph: null },
    }),
  );
  const input = {
    datasetId: "public-latest",
    cellId: "81655936",
    weekday: "fri",
  } as const;
  assert.equal(await getLiveVisitPattern(input), null);
  assert.equal(await getLiveVisitPattern(input), null);
});

test("area browsing pages through area-recommendations without duplicate stores", async (t) => {
  const calls: URL[] = [];
  const pages = [
    { total: 3, page: 0, hasNext: true, items: [place, { ...place, id: 2 }] },
    {
      total: 3,
      page: 1,
      hasNext: false,
      items: [
        { ...place, id: 2 },
        { ...place, id: 3, areaId: "euljiro" },
      ],
    },
  ];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    calls.push(url);
    const data = url.pathname.endsWith("/meta")
      ? meta
      : pages[Number(url.searchParams.get("page"))];
    return Response.json({ success: true, data });
  });
  const source = createLiveDiscoveryDataSource();
  const first = await source.query(query);
  const area = calls[1]!;
  assert.equal(area.pathname, "/api/v2/area-recommendations");
  assert.deepEqual(Object.fromEntries(area.searchParams), {
    datasetId: "public-latest",
    weekday: "fri",
    slot: "dinner",
    categories: "food,cafe",
    page: "0",
    size: "30",
    areaId: "euljiro",
    lang: "en",
  });
  assert.equal(first.total, 3);
  assert.equal(first.items.length, 2);
  assert.equal(first.hasNext, true);
  const second = await source.queryNext!(query, first);
  assert.equal(calls[2]?.searchParams.get("page"), "1");
  assert.deepEqual(
    second.items.map(({ id }) => id),
    ["1557", "2", "3"],
  );
  assert.equal(second.items[2]?.area, "euljiro");
  assert.equal(second.hasNext, false);
  assert.equal(await source.queryNext!(query, second), second);
  assert.equal(calls.length, 3);

  await source.query({ ...query, area: "all", category: "cafe" });
  assert.equal(calls.at(-1)?.searchParams.has("areaId"), false);
  assert.equal(calls.at(-1)?.searchParams.get("categories"), "cafe");
  await source.query({ ...query, category: "food" });
  assert.equal(calls.at(-1)?.searchParams.get("categories"), "food");
  // An area missing from the metadata is browsed as all areas.
  await source.query({ ...query, area: "bukchon" });
  assert.equal(calls.at(-1)?.searchParams.has("areaId"), false);
});
