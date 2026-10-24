import assert from "node:assert/strict";
import { test } from "node:test";
import { localPlaces } from "../src/features/discovery/data/preview/places.ts";
import { filterLocalPlaces } from "../src/features/discovery/data/preview/recommendations.ts";
import { fitPhoneScale } from "../src/features/discovery/preview-viewport.ts";
import { readDiscoveryUrl } from "../src/features/discovery/state/url-state.ts";

test("phone preview always fits by scaling its fixed aspect ratio", () => {
  assert.equal(fitPhoneScale(1440, 1000), 1);
  const narrow = fitPhoneScale(300, 700);
  assert.ok(Math.abs(narrow - 268 / 413) < 1e-9);
  assert.ok(413 * narrow <= 300 - 32);
  assert.ok(872 * narrow <= 700 - 32);
  assert.ok(Math.abs(fitPhoneScale(900, 500) - 468 / 872) < 1e-9);
});

test("Jongno includes its neighborhoods and excludes Euljiro", () => {
  const selected = filterLocalPlaces(localPlaces, "jongno", "all", "");
  assert.ok(selected.length >= 15);
  assert.ok(selected.every((place) => place.area !== "eulji"));
});

test("the café preference includes cafés rather than excluding the current activity", () => {
  const selected = filterLocalPlaces(localPlaces, "ikseon", "cafe", "");
  assert.deepEqual(
    selected.map((place) => place.id),
    ["cheongsudang", "seoulcoffee", "highwaist", "rainreport"],
  );
});

test("search supports Korean, English, and whitespace without changing the collection", () => {
  assert.equal(
    filterLocalPlaces(localPlaces, "all", "all", "  청수당 ")[0]?.id,
    "cheongsudang",
  );
  assert.equal(
    filterLocalPlaces(localPlaces, "all", "all", "COFFEE HANYAKBANG")[0]?.id,
    "hanyakbang",
  );
  assert.equal(
    filterLocalPlaces(localPlaces, "all", "food", "coffee").length,
    0,
  );
  assert.equal(localPlaces.length, 22);
});

test("deep links restore a screen, a detail, a neighborhood, and the language", () => {
  assert.deepEqual(
    readDiscoveryUrl("?view=map&place=cheongsudang&area=ikseon&lang=ko"),
    { view: "map", place: "cheongsudang", area: "ikseon", language: "ko" },
  );
  assert.deepEqual(readDiscoveryUrl("?view=missing&area=unknown"), {
    view: "discover",
    place: null,
    area: "all",
    language: "en",
  });
});
