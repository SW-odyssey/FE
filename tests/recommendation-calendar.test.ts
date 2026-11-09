import assert from "node:assert/strict";
import { test } from "node:test";
import { previewQuery } from "../src/features/discovery/data/preview.ts";
import {
  adjacentMonth,
  visitCalendar,
} from "../src/features/discovery/visit-calendar.ts";

test("calendar crosses month and year boundaries without extending the request window", () => {
  for (const clock of [
    new Date("2026-10-31T06:00:00Z"),
    new Date("2026-12-31T06:00:00Z"),
    new Date("2028-02-28T06:00:00Z"),
  ]) {
    const month = clock.toISOString().slice(0, 7);
    const cells = [
      ...visitCalendar(clock, month),
      ...visitCalendar(clock, adjacentMonth(month, 1)),
    ];
    assert.deepEqual(
      cells.filter((cell) => cell?.enabled).map((cell) => cell!.offset),
      [0, 1, 2, 3, 4, 5, 6],
    );
    for (const grid of [
      visitCalendar(clock, month),
      visitCalendar(clock, adjacentMonth(month, 1)),
    ])
      assert.equal(grid.length % 7, 0);
  }
  assert.equal(adjacentMonth("2026-12", 1), "2027-01");
  assert.equal(adjacentMonth("2027-01", -1), "2026-12");
});

test("recommendation analysis contains only matching OR tags and retains preview provenance", () => {
  const result = previewQuery({
    area: "jongno",
    category: "all",
    query: "",
    slot: "afternoon",
    activity: "quiet",
    origin: null,
    spaces: ["hanok", "retro"],
  });
  assert.ok(result.total > 0);
  for (const place of result.items) {
    const analysis = result.analyses![place.id];
    assert.equal(analysis.provenance, "preview");
    assert.ok(analysis.matchedSpaces.length > 0);
    assert.ok(
      analysis.matchedSpaces.every((tag) => analysis.spaces.includes(tag)),
    );
  }
  assert.equal(Object.hasOwn(result.analyses!, "missing"), false);
});
