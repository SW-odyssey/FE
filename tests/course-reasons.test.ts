import assert from "node:assert/strict";
import { test } from "node:test";
import {
  courseReasonText,
  parseCourseReasons,
  shownCourseReasons,
} from "../src/features/discovery/course-reasons.ts";
import { getCourse } from "../src/features/discovery/data/course-api.ts";

const languages = ["en", "ko", "ja", "zh"] as const;

test("reasons keep server order and drop unknown or invalid codes", () => {
  assert.deepEqual(
    parseCourseReasons([
      { code: "LOCAL_TOP", percent: 3 },
      { code: "NEW_SIGNAL", score: 9 },
      { code: "OPEN_DURING_STAY", from: "18:00", to: "19:00" },
      { code: "OPEN_DURING_STAY", from: "late", to: "19:00" },
      { code: "PEAK_NOW" },
      { code: "AREA_TYPE", type: "unknown" },
      { code: "AREA_TYPE", type: "late_night" },
      { code: "SIMILAR_CHOICES", count: 1 },
      { code: "SIMILAR_CHOICES", count: 4 },
      { code: "LOCAL_TOP", percent: 0 },
      null,
    ]),
    [
      { code: "LOCAL_TOP", percent: 3 },
      { code: "OPEN_DURING_STAY", from: "18:00", to: "19:00" },
      { code: "PEAK_NOW" },
      { code: "AREA_TYPE", type: "late_night" },
      { code: "SIMILAR_CHOICES", count: 4 },
    ],
  );
  assert.deepEqual(parseCourseReasons(undefined), []);
  assert.deepEqual(parseCourseReasons([]), []);
  assert.equal(shownCourseReasons, 2);
});

test("every reason has a non-empty line in four languages", () => {
  const reasons = parseCourseReasons([
    { code: "LOCAL_TOP", percent: 3 },
    { code: "OPEN_DURING_STAY", from: "18:00", to: "19:00" },
    { code: "PEAK_NOW" },
    { code: "AREA_TYPE", type: "late_night" },
    { code: "AREA_TYPE", type: "weekend_day" },
    { code: "AREA_TYPE", type: "weekday_day" },
    { code: "AREA_TYPE", type: "mixed" },
    { code: "SIMILAR_CHOICES", count: 4 },
  ]);
  for (const reason of reasons)
    for (const language of languages)
      assert.ok(courseReasonText(reason, language).trim(), reason.code);
  assert.deepEqual(
    languages.map((language) => courseReasonText(reasons[0]!, language)),
    [
      "Top 3% for visits within 50 m",
      "주변 50m 방문 상위 3%",
      "周辺50mの来訪上位3%",
      "周边50米到访量前3%",
    ],
  );
  assert.equal(courseReasonText(reasons[1]!, "ko"), "18:00–19:00 영업시간 안");
});

test("the course adapter keeps reasons per stop, including none and partial", async (t) => {
  const stop = (position: number, reasons: unknown) => ({
    position,
    slot: "lunch",
    visitTime: "12:00",
    leaveTime: "12:50",
    walkMinutes: 4,
    candidateRank: 1,
    hoursUnknown: false,
    reasons,
    place: {
      id: position,
      name: "x",
      kind: "korean",
      lat: 37.5,
      lng: 126.9,
      distanceMeters: 10,
      googlePlaceId: null,
    },
  });
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({
      success: true,
      data: {
        status: "COMPLETE",
        context: { datasetId: "d" },
        seed: 1,
        stops: [
          stop(1, [{ code: "LOCAL_TOP", percent: 2 }, { code: "PEAK_NOW" }]),
          stop(2, []),
          stop(3, [{ code: "FUTURE" }, { code: "SIMILAR_CHOICES", count: 3 }]),
        ],
        skipped: [],
        interruption: null,
      },
    }),
  );
  const course = await getCourse(
    {
      datasetId: "d",
      visitDate: "2026-11-27",
      slot: "lunch",
      origin: { lat: 37.5, lng: 126.9 },
    },
    new AbortController().signal,
  );
  assert.deepEqual(
    course.route.map(({ reasons }) => reasons.map(({ code }) => code)),
    [["LOCAL_TOP", "PEAK_NOW"], [], ["SIMILAR_CHOICES"]],
  );
});
