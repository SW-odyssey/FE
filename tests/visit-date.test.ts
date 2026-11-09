import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { seoulHour, visitDate } from "../src/features/discovery/visit-date.ts";

test("Seoul midnight changes the date at 15:00 UTC", () => {
  assert.equal(
    visitDate(new Date("2026-10-24T14:59:59.999Z"), 0),
    "2026-10-24",
  );
  assert.equal(
    visitDate(new Date("2026-10-24T15:00:00.000Z"), 0),
    "2026-10-25",
  );
  assert.equal(seoulHour(new Date("2026-10-24T14:59:59.999Z")), 23);
  assert.equal(seoulHour(new Date("2026-10-24T15:00:00.000Z")), 0);
});

test("Seoul slot hours retain the Korean baseline through late night", () => {
  assert.equal(seoulHour(new Date("2026-10-24T12:30:00+09:00")), 12);
  assert.equal(seoulHour(new Date("2026-10-24T18:00:00+09:00")), 18);
  assert.equal(seoulHour(new Date("2026-10-24T22:00:00+09:00")), 22);
  assert.equal(seoulHour(new Date("2026-10-25T00:30:00+09:00")), 0);
  assert.equal(seoulHour(new Date("2026-12-31T15:30:00Z")), 0);
});

test("Seoul hours always use the 0..23 clock rather than 24 at midnight", () => {
  const clock = new Date("2026-10-24T15:00:00Z");
  assert.deepEqual(
    Array.from({ length: 24 }, (_, hour) =>
      seoulHour(new Date(clock.getTime() + hour * 60 * 60 * 1000)),
    ),
    Array.from({ length: 24 }, (_, hour) => hour),
  );
});

test("zero offset supplies today's Seoul date for auto mode", () => {
  assert.equal(
    visitDate(new Date("2026-10-24T23:30:00-04:00"), 0),
    "2026-10-25",
  );
});

test("calendar offsets handle month, leap day and year rollover", () => {
  assert.equal(visitDate(new Date("2026-10-31T03:00:00Z"), 1), "2026-11-01");
  assert.equal(visitDate(new Date("2028-02-28T03:00:00Z"), 1), "2028-02-29");
  assert.equal(visitDate(new Date("2028-02-28T03:00:00Z"), 2), "2028-03-01");
  assert.equal(visitDate(new Date("2026-12-31T14:59:59Z"), 1), "2027-01-01");
  assert.equal(visitDate(new Date("2026-12-31T15:00:00Z"), 6), "2027-01-07");
});

test("seven selectable offsets stay within the Seoul seven-day window", () => {
  const clock = new Date("2026-10-24T03:00:00Z");
  assert.deepEqual(
    Array.from({ length: 7 }, (_, day) => visitDate(clock, day)),
    [
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
    ],
  );
});

test("day values follow the existing bounded preview input without mutating clock", () => {
  const clock = new Date("2026-10-24T12:34:56.789Z");
  const before = clock.getTime();
  assert.equal(visitDate(clock, -2), "2026-10-24");
  assert.equal(visitDate(clock, 12), "2026-10-30");
  assert.equal(visitDate(clock, 1.9), "2026-10-25");
  assert.equal(visitDate(clock, Number.NaN), "2026-10-24");
  assert.equal(seoulHour(clock), 21);
  assert.equal(clock.getTime(), before);
});

test("UTC and LA devices use the same Seoul request date and late-night hour", () => {
  const moduleUrl = new URL(
    "../src/features/discovery/visit-date.ts",
    import.meta.url,
  ).href;
  const script = `import { visitDate, seoulHour } from ${JSON.stringify(moduleUrl)}; const clock = new Date('2026-12-31T15:30:00Z'); process.stdout.write(JSON.stringify({date: visitDate(clock, 6), hour: seoulHour(clock)}));`;
  for (const timezone of [
    "UTC",
    "Asia/Seoul",
    "America/Los_Angeles",
    "Pacific/Kiritimati",
  ]) {
    const result = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", script],
      {
        env: { ...process.env, TZ: timezone },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    assert.deepEqual(
      JSON.parse(result),
      { date: "2027-01-07", hour: 0 },
      timezone,
    );
  }
});
