import assert from "node:assert/strict";
import { test } from "node:test";
import { v2Time } from "../src/features/discovery/data/v2-client.ts";
import { parseServiceMeta } from "../src/features/discovery/data/service-meta.ts";
import { formatClosedTime } from "../src/features/discovery/presentation.ts";
import {
  autoVisit,
  defaultSlotWindows,
  slotHoursFrom,
} from "../src/features/discovery/visit-time.ts";

// GET /api/v2/meta slotWindows on 2026-11-27 (BE #100).
const windows = parseServiceMeta({
  slotWindows: [
    { slot: "lunch", from: "11:00", toExclusive: "13:00", endsNextDay: false },
    {
      slot: "afternoon",
      from: "14:00",
      toExclusive: "17:00",
      endsNextDay: false,
    },
    { slot: "dinner", from: "18:00", toExclusive: "21:00", endsNextDay: false },
    {
      slot: "late_night",
      from: "22:00",
      toExclusive: "01:00",
      endsNextDay: true,
    },
  ],
}).slotWindows;
const at = (time: string) => autoVisit(new Date(`${time}+09:00`), windows);
const brief = (time: string) => {
  const { open, slot, visitDate } = at(time);
  return [open, slot, visitDate];
};

test("the fallback windows equal the published windows", () => {
  assert.deepEqual(defaultSlotWindows, windows);
  assert.deepEqual(slotHoursFrom(windows), {
    lunch: "11:00–13:00",
    afternoon: "14:00–17:00",
    evening: "18:00–21:00",
    late: "22:00–01:00",
  });
});

test("inclusive starts and exclusive ends follow the slot windows", () => {
  assert.deepEqual(brief("2026-11-27T11:00"), [true, "lunch", "2026-11-27"]);
  assert.deepEqual(brief("2026-11-27T12:59"), [true, "lunch", "2026-11-27"]);
  assert.deepEqual(brief("2026-11-27T14:00"), [
    true,
    "afternoon",
    "2026-11-27",
  ]);
  assert.deepEqual(brief("2026-11-27T18:00"), [true, "evening", "2026-11-27"]);
  assert.deepEqual(brief("2026-11-27T22:00"), [true, "late", "2026-11-27"]);
  assert.deepEqual(brief("2026-11-27T23:59"), [true, "late", "2026-11-27"]);
});

test("gaps between windows show the next slot instead of now", () => {
  assert.deepEqual(brief("2026-11-27T07:00"), [false, "lunch", "2026-11-27"]);
  assert.deepEqual(brief("2026-11-27T13:00"), [
    false,
    "afternoon",
    "2026-11-27",
  ]);
  assert.deepEqual(brief("2026-11-27T13:59"), [
    false,
    "afternoon",
    "2026-11-27",
  ]);
  assert.deepEqual(brief("2026-11-27T17:00"), [false, "evening", "2026-11-27"]);
  assert.deepEqual(brief("2026-11-27T21:00"), [false, "late", "2026-11-27"]);
  assert.deepEqual(brief("2026-11-28T01:00"), [false, "lunch", "2026-11-28"]);
  assert.equal(at("2026-11-27T07:00").from, "11:00");
});

test("Saturday 00:30 is requested as Friday late night", () => {
  const visit = at("2026-11-28T00:30");
  assert.deepEqual(
    [visit.open, visit.slot, visit.visitDate],
    [true, "late", "2026-11-27"],
  );
  assert.deepEqual(v2Time(visit.visitDate, visit.slot), {
    weekday: "fri",
    slot: "late_night",
  });
  assert.deepEqual(brief("2026-11-28T00:59"), [true, "late", "2026-11-27"]);
});

test("after-midnight late night crosses month and year boundaries", () => {
  assert.deepEqual(brief("2026-12-01T00:10"), [true, "late", "2026-11-30"]);
  assert.deepEqual(brief("2027-01-01T00:30"), [true, "late", "2026-12-31"]);
  assert.deepEqual(brief("2028-03-01T00:30"), [true, "late", "2028-02-29"]);
  assert.equal(v2Time("2026-12-31", "late").weekday, "thu");
});

test("the result is the same on any device timezone", () => {
  const instant = new Date("2026-11-27T15:30:00Z"); // Saturday 00:30 in Seoul
  assert.deepEqual(
    [autoVisit(instant, windows).slot, autoVisit(instant, windows).visitDate],
    ["late", "2026-11-27"],
  );
});

test("the closed-time notice names the current time and the shown slot", () => {
  const clock = new Date("2026-11-27T07:00+09:00");
  const next = at("2026-11-27T07:00");
  assert.deepEqual(
    (
      [
        ["en", "Lunch"],
        ["ko", "점심"],
        ["ja", "昼食"],
        ["zh", "午间"],
      ] as const
    ).map(([language, name]) => formatClosedTime(clock, next, name, language)),
    [
      "No visit data at 07:00. Showing lunch (11:00–13:00).",
      "지금(07:00)은 방문 데이터가 없는 시간이에요. 점심(11:00–13:00) 추천을 보여 드려요.",
      "現在（07:00）は来訪データがない時間帯です。昼食（11:00–13:00）のおすすめを表示しています。",
      "当前（07:00）没有到访数据。正在显示午间（11:00–13:00）的推荐。",
    ],
  );
});
