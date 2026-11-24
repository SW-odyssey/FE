import assert from "node:assert/strict";
import { test } from "node:test";
import {
  courseSlots,
  recommendCourses,
} from "../src/features/discovery/auto-course.ts";
import {
  googleMapsCourseLink,
  googleMapsPlaceUrl,
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
  const [best] = recommendCourses(pools, slots, null);
  assert.deepEqual(
    best.map((leg) => leg.slot),
    slots,
  );
  assert.equal(new Set(best.map((leg) => leg.place.id)).size, 3);
  assert.equal(best[1].place.category, "cafe");
  const [browsing] = recommendCourses(pools, slots, null, {
    includeCafe: false,
    browsePlace: shop,
  });
  assert.equal(browsing[1].place.id, shop.id);

  const [both] = recommendCourses(pools, slots, null, {
    includeCafe: true,
    browsePlace: shop,
  });
  assert.deepEqual(
    both.map(({ slot }) => slot),
    ["lunch", "afternoon", "afternoon", "evening"],
  );
  assert.equal(both[1].place.category, "cafe");
  assert.equal(both[2].place.id, shop.id);

  const [neither] = recommendCourses(pools, slots, null, {
    includeCafe: false,
    browsePlace: null,
  });
  assert.deepEqual(
    neither.map(({ slot }) => slot),
    ["lunch", "evening"],
  );
});

test("course alternatives preserve the filters and avoid identical itineraries", () => {
  const pools = { afternoon: [first, first, second], evening: [third] };
  const slots = courseSlots("afternoon", false);
  const alternatives = recommendCourses(pools, slots, null);
  assert.equal(alternatives.length, 2);
  assert.deepEqual(
    new Set(alternatives.map((course) => course[0].place.id)),
    new Set([first.id, second.id]),
  );
  for (const course of alternatives) {
    assert.deepEqual(
      course.map(({ slot }) => slot),
      slots,
    );
    assert.equal(course[1].place.id, third.id);
  }
  assert.equal(
    recommendCourses({ evening: [third, third] }, ["evening"], null).length,
    1,
  );
  assert.deepEqual(recommendCourses({}, slots, null), []);
});

test("Google Maps receives the place shortlist in visit order", () => {
  const placeIds = ["place-first", "place-second", "place-third"];
  const stops = [first, second, third].map((place, index) => ({
    ...place,
    googlePlaceId: placeIds[index],
  }));
  const link = new URL(googleMapsCourseLink(stops)!);
  assert.equal(link.origin + link.pathname, "https://www.google.com/maps/@");
  assert.equal(link.searchParams.get("api"), "1");
  assert.equal(link.searchParams.get("map_action"), "shortlist");
  assert.equal(link.searchParams.get("place_ids"), placeIds.join(","));
});

test("single stops open place details and incomplete lists expose per-place links", () => {
  const firstStop = { ...first, googlePlaceId: "place-first" };
  const link = new URL(googleMapsCourseLink([firstStop])!);
  assert.equal(link.pathname, "/maps/search/");
  assert.equal(
    link.searchParams.get("query"),
    `${first.koreanName} ${first.address}`,
  );
  assert.equal(link.searchParams.get("query_place_id"), "place-first");
  const secondStop = { ...second, googlePlaceId: undefined };
  assert.equal(googleMapsCourseLink([firstStop, secondStop]), null);
  const unmapped = new URL(googleMapsPlaceUrl(secondStop));
  assert.equal(
    unmapped.searchParams.get("query"),
    `${second.koreanName} ${second.address}`,
  );
  assert.equal(unmapped.searchParams.has("query_place_id"), false);
  assert.equal(googleMapsCourseLink([]), null);
});
