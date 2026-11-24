import assert from "node:assert/strict";
import { test } from "node:test";
import {
  courseOrigin,
  courseSearchParams,
  getCourse,
  getCourseDataset,
} from "../src/features/discovery/data/course-api.ts";

const request = {
  datasetId: "published",
  visitDate: "2026-11-27",
  slot: "evening" as const,
  origin: courseOrigin("eulji"),
};

test("course queries use the Seoul weekday and v2 start slot", () => {
  assert.deepEqual(Object.fromEntries(courseSearchParams(request)), {
    datasetId: "published",
    weekday: "fri",
    startSlot: "dinner",
    lat: "37.5655342",
    lng: "126.9903373",
  });
});

test("course adapter loads the published batch and keeps server positions and empty states", async (t) => {
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
        },
      },
    ],
    skipped: [{ position: 5, slot: "dinner", reason: "SKIPPED_FOR_ROUTE" }],
    interruption: { slot: "late_night", reason: "NO_NEARBY_MATCH" },
  };
  const fetch = t.mock.method(globalThis, "fetch", async (url: URL) =>
    Response.json({
      success: true,
      data: url.pathname.endsWith("/meta")
        ? { datasets: [{ id: "published" }] }
        : response,
    }),
  );
  const { signal } = new AbortController();
  const datasetId = await getCourseDataset(signal);
  const course = await getCourse({ ...request, datasetId }, signal);
  assert.equal(fetch.mock.callCount(), 2);
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
