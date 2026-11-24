import assert from "node:assert/strict";
import { test } from "node:test";
import {
  googleMapsCourseLink,
  googleMapsPlaceUrl,
  toggleAfternoonChoice,
} from "../src/features/discovery/course.ts";
import { localPlaces } from "../src/features/discovery/data/preview/places.ts";

const [first, second, third] = localPlaces;

test("both afternoon chips can be selected and toggled back to either choice", () => {
  assert.equal(toggleAfternoonChoice("cafe", "shop"), "mixed");
  assert.equal(toggleAfternoonChoice("shop", "cafe"), "mixed");
  assert.equal(toggleAfternoonChoice("mixed", "cafe"), "shop");
  assert.equal(toggleAfternoonChoice("mixed", "shop"), "cafe");
  assert.equal(toggleAfternoonChoice("cafe", "cafe"), "cafe");
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
