import assert from "node:assert/strict";
import { test } from "node:test";
import {
  courseSearchParams,
  getCourse,
  getCoursePlaceDetail,
} from "../src/features/discovery/data/course-api.ts";

const request = {
  datasetId: "published",
  visitDate: "2026-11-27",
  slot: "evening" as const,
  origin: { lat: 37.565748, lng: 126.99013 },
};

test("course queries use the Seoul weekday and v2 start slot", () => {
  assert.deepEqual(Object.fromEntries(courseSearchParams(request)), {
    datasetId: "published",
    weekday: "fri",
    startSlot: "dinner",
    lat: "37.565748",
    lng: "126.99013",
  });
});

test("full course rebuild sends previous stores without excluding them", () => {
  const query = courseSearchParams({
    ...request,
    previousStopIds: ["41", "42"],
    seed: 8,
  });
  assert.equal(query.get("previousStopIds"), "41,42");
  assert.equal(query.get("seed"), "8");
  assert.equal(query.has("excludeIds"), false);
});

test("course adapter keeps server positions, area IDs and empty states", async (t) => {
  const response = {
    status: "PARTIAL",
    context: { datasetId: "published" },
    seed: 7,
    stops: [
      {
        position: 4,
        slot: "dinner",
        visitTime: "18:00",
        leaveTime: "19:00",
        walkMinutes: 5,
        hoursUnknown: false,
        reasons: [],
        place: {
          id: 41,
          name: "식당",
          kind: "korean",
          lat: 37.56,
          lng: 126.99,
          distanceMeters: 200,
          googlePlaceId: null,
          areaId: "euljiro",
        },
      },
    ],
    skipped: [{ position: 5, slot: "dinner", reason: "SKIPPED_FOR_ROUTE" }],
    interruption: { slot: "late_night", reason: "NO_NEARBY_MATCH" },
  };
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: true, data: response }),
  );
  const { signal } = new AbortController();
  const course = await getCourse(request, signal);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(course.route[0]?.place.area, "euljiro");
  assert.equal(course.status, "PARTIAL");
  assert.equal(course.route[0]?.position, 4);
  assert.equal(course.route[0]?.place.id, "41");
  assert.equal(course.route[0]?.distanceMeters, 200);
  assert.equal(course.route[0]?.place.googlePlaceId, undefined);
  assert.deepEqual(course.skipped, [
    { position: 5, slot: "evening", reason: "SKIPPED_FOR_ROUTE" },
  ]);
  assert.deepEqual(course.interruption, {
    slot: "late",
    reason: "NO_NEARBY_MATCH",
  });
});

test("changing a slot uses the previous stop and excludes the visited and replaced places", async (t) => {
  const { replaceCourseSuffix } =
    await import("../src/features/discovery/data/course-replacement.ts");
  const urls: URL[] = [];
  const stop = (position: number, slot: string, id: number) => ({
    position,
    slot,
    visitTime: "12:00",
    leaveTime: "12:50",
    walkMinutes: 4,
    hoursUnknown: false,
    reasons: [],
    place: {
      id,
      name: String(id),
      kind: "korean",
      lat: 37.56,
      lng: 126.99,
      distanceMeters: 200,
      googlePlaceId: null,
    },
  });
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    urls.push(url);
    return Response.json({
      success: true,
      data: {
        status: "COMPLETE",
        context: { datasetId: "published" },
        seed: 7,
        stops:
          urls.length === 1
            ? [stop(1, "lunch", 11), stop(4, "dinner", 44)]
            : [stop(4, "dinner", 45), stop(5, "dinner", 55)],
        skipped: [],
        interruption: null,
      },
    });
  });
  const { signal } = new AbortController();
  const localizedRequest = { ...request, language: "ja" as const };
  const course = await getCourse(localizedRequest, signal);
  const result = await replaceCourseSuffix(
    localizedRequest,
    course,
    { slot: "evening", excludeIds: ["44"] },
    signal,
  );
  assert.equal(urls[1].searchParams.get("lat"), "37.56");
  assert.equal(urls[1].searchParams.get("lng"), "126.99");
  assert.equal(urls[1].searchParams.get("excludeIds"), "11,44");
  assert.equal(urls[1].searchParams.has("previousStopIds"), false);
  assert.equal(urls[1].searchParams.get("seed"), "7");
  assert.equal(urls[0].searchParams.get("lang"), "ja");
  assert.equal(urls[1].searchParams.get("lang"), "ja");
  assert.deepEqual(
    result?.route.map(({ place }) => place.id),
    ["11", "45", "55"],
  );
});

test("course filters and an explicit late-night start match server parameters", () => {
  const query = courseSearchParams({
    ...request,
    slot: "late",
    seed: 12,
    options: { afternoon: "shop", walk: "short", lateNight: false },
  });
  assert.equal(query.get("afternoon"), "shop");
  assert.equal(query.get("lateNight"), "true");
  assert.equal(query.get("walk"), "short");
  assert.equal(query.get("seed"), "12");
});

test("a mixed afternoon is sent on the same course request", () => {
  assert.equal(
    courseSearchParams({
      ...request,
      options: { afternoon: "mixed", walk: "default", lateNight: false },
    }).get("afternoon"),
    "mixed",
  );
});

test("live place detail never merges sample copy, even for a sample's Google ID", async (t) => {
  const { localPlaces } =
    await import("../src/features/discovery/data/preview/places.ts");
  const sampleIds = localPlaces
    .map(({ googlePlaceId }) => googlePlaceId)
    .filter((id): id is string => Boolean(id));
  assert.ok(sampleIds.length >= 8);
  let current = "";
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      success: true,
      data: {
        id: 41,
        name: "실제 매장",
        kind: "korean",
        lat: 37.5,
        lng: 126.9,
        googlePlaceId: current,
      },
    }),
  );
  for (const googlePlaceId of sampleIds) {
    current = googlePlaceId;
    const detail = await getCoursePlaceDetail("41");
    assert.equal(detail.place.name, "실제 매장");
    assert.equal(detail.aiSummary, undefined, googlePlaceId);
    assert.deepEqual(detail.descriptions, { ko: "", en: "", ja: "", zh: "" });
    assert.equal(detail.sourceUrl, "");
    assert.equal(detail.place.sourceUrl, "");
    assert.equal(detail.photos.length, 0);
    assert.equal(detail.visitPattern, undefined);
  }
});

test("only the /guide preview adds sourced sample copy for a matching Google ID", async (t) => {
  const { getPreviewCoursePlaceDetail } =
    await import("../src/features/discovery/data/preview.ts");
  t.mock.method(globalThis, "fetch", async (url: URL) =>
    Response.json({
      success: true,
      data: {
        id: 41,
        name: "온천집 익선",
        kind: "korean",
        googlePlaceId: url.pathname.endsWith("/41")
          ? "ChIJ-53H9-mjfDURpOg-_9us6qo"
          : "different-place",
      },
    }),
  );
  const match = await getPreviewCoursePlaceDetail("41");
  assert.ok(match.aiSummary?.ko.includes("샤부샤부"));
  assert.ok(match.place.sourceUrl.includes("visitkorea.or.kr"));
  const nonMatch = await getPreviewCoursePlaceDetail("42");
  assert.equal(nonMatch.aiSummary, undefined);
  assert.equal(nonMatch.place.sourceUrl, "");
});
