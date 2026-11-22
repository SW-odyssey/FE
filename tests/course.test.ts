import assert from "node:assert/strict";
import { test } from "node:test";
import {
  autoCourseAlternatives,
  courseSlots,
  rankAutoCourses,
} from "../src/features/discovery/auto-course.ts";
import {
  courseCandidates,
  moveCourseStop,
  readCourse,
} from "../src/features/discovery/course.ts";
import { localPlaces } from "../src/features/discovery/data/preview/places.ts";

const [first, second, third] = localPlaces;

test("automatic courses start in the selected slot and omit late night by default", () => {
  assert.deepEqual(courseSlots("afternoon", false), ["afternoon", "evening"]);
  assert.deepEqual(courseSlots("afternoon", true), [
    "afternoon",
    "evening",
    "late",
  ]);
});

test("courses use distinct places with a café by default and allow a supported browse stop", () => {
  const shop = localPlaces.find((place) => place.id === "ssamziegil")!;
  const otherFood = localPlaces.find((place) => place.id === "songam")!;
  const pools = {
    lunch: [third, otherFood],
    afternoon: [first, second],
    evening: [third, otherFood],
  };
  const slots = courseSlots("lunch", false);
  const [best] = rankAutoCourses(pools, slots, null);
  assert.deepEqual(
    best.map((leg) => leg.slot),
    slots,
  );
  assert.equal(new Set(best.map((leg) => leg.place.id)).size, 3);
  assert.equal(best[1].place.category, "cafe");
  const [browsing] = rankAutoCourses(pools, slots, null, shop);
  assert.equal(browsing[1].place.id, shop.id);
  assert.deepEqual(
    autoCourseAlternatives(best, "afternoon", pools.afternoon, null),
    [best[1].place.id === first.id ? second : first],
  );
  assert.deepEqual(
    autoCourseAlternatives(browsing, "afternoon", pools.afternoon, null),
    [],
  );
});

test("saved courses restore in visit order and ignore malformed and duplicate stops", () => {
  const restored = readCourse(
    JSON.stringify([
      second,
      { ...first, lat: null },
      null,
      second,
      first,
      { ...third, lng: 190 },
    ]),
  );
  assert.deepEqual(
    restored.map(({ id }) => id),
    [second.id, first.id],
  );
  assert.deepEqual(readCourse("{"), []);
  assert.deepEqual(readCourse(null), []);
});

test("moving a stop preserves all stops and does not mutate the previous order", () => {
  const original = [first, second, third];
  const moved = moveCourseStop(original, third.id, -1);
  assert.deepEqual(moved, [first, third, second]);
  assert.deepEqual(original, [first, second, third]);
  assert.equal(moveCourseStop(original, first.id, -1), original);
  assert.equal(moveCourseStop(original, "missing", 1), original);
});

test("recommendations exclude all selected stops and rank by the last remaining stop", () => {
  const nearFirst = {
    ...third,
    id: "near-first",
    lat: first.lat,
    lng: first.lng,
  };
  const nearSecond = {
    ...third,
    id: "near-second",
    lat: second.lat,
    lng: second.lng,
  };
  const places = [first, nearFirst, second, nearSecond];
  assert.deepEqual(courseCandidates(places, [first, second]), [
    nearSecond,
    nearFirst,
  ]);
  assert.deepEqual(courseCandidates(places, [second, first]), [
    nearFirst,
    nearSecond,
  ]);
  assert.deepEqual(courseCandidates(localPlaces, []), localPlaces.slice(0, 4));
});
