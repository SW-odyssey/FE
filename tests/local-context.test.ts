import assert from "node:assert/strict";
import { test } from "node:test";
import { localPlaces } from "../src/features/discovery/data/preview/places.ts";
import {
  placeSpaces,
  recommendPlaces,
} from "../src/features/discovery/data/preview/recommendations.ts";
import { readSpacePreferences } from "../src/features/discovery/filters.ts";
import { slotAt } from "../src/features/discovery/visit-time.ts";
import {
  distanceMeters,
  groupMapPlaces,
  inMapScope,
  previewCell,
} from "../src/features/map/geometry.ts";
test("space deep links discard unknown tags, deduplicate and keep a stable selection order", () => {
  assert.deepEqual(readSpacePreferences("retro,hanok,unknown,retro"), [
    "hanok",
    "retro",
  ]);
  assert.deepEqual(readSpacePreferences(null), []);
  assert.deepEqual(readSpacePreferences("unknown"), []);
});
test("multiple spaces form a union and ambience, time and category continue to narrow it", () => {
  const all = recommendPlaces(localPlaces, "afternoon", "any", null);
  const hanok = recommendPlaces(localPlaces, "afternoon", "any", null, [
    "hanok",
  ]);
  const retro = recommendPlaces(localPlaces, "afternoon", "any", null, [
    "retro",
  ]);
  const combined = recommendPlaces(localPlaces, "afternoon", "any", null, [
    "hanok",
    "retro",
  ]);
  const expected = new Set([...hanok, ...retro].map((p) => p.id));
  assert.deepEqual(
    combined.map((p) => p.id),
    all.filter((p) => expected.has(p.id)).map((p) => p.id),
  );
  const quiet = new Set(
    recommendPlaces(localPlaces, "afternoon", "quiet", null).map((p) => p.id),
  );
  const quietHanok = recommendPlaces(localPlaces, "afternoon", "quiet", null, [
    "hanok",
  ]);
  assert.ok(quietHanok.length > 0);
  assert.ok(
    quietHanok.every(
      (p) => quiet.has(p.id) && placeSpaces[p.id].includes("hanok"),
    ),
  );
  const cafes = recommendPlaces(
    localPlaces.filter((p) => p.category === "cafe"),
    "afternoon",
    "any",
    null,
    ["hanok"],
  );
  assert.ok(cafes.every((p) => p.category === "cafe" && expected.has(p.id)));
  assert.deepEqual(
    recommendPlaces(localPlaces, "late", "quiet", null, ["hanok"]),
    [],
  );
});
test("time boundaries cover midnight and the four request slots", () => {
  assert.equal(slotAt(0), "late");
  assert.equal(slotAt(12), "lunch");
  assert.equal(slotAt(14), "afternoon");
  assert.equal(slotAt(18), "evening");
  assert.equal(slotAt(22), "late");
});
test("area counts retain all filtered places and never imply a popularity rank", () => {
  const places = recommendPlaces(localPlaces, "afternoon", "any", null);
  const groups = groupMapPlaces(places, false);
  assert.equal(groups.flatMap((g) => g.places).length, places.length);
  assert.equal(
    new Set(groups.flatMap((g) => g.places.map((p) => p.id))).size,
    places.length,
  );
  assert.ok(
    groups.every((g) => g.places.every((p) => `area:${p.area}` === g.id)),
  );
  const cafes = places.filter((p) => p.category === "cafe");
  assert.equal(
    groupMapPlaces(cafes, false).reduce((n, g) => n + g.places.length, 0),
    cafes.length,
  );
  assert.deepEqual(groupMapPlaces([], false), []);
});
test("close map counts keep colocated venues together without discarding other cells", () => {
  const first = localPlaces[0];
  const same = { ...first, id: "same-cell" };
  const distant = { ...first, id: "other-cell", lat: first.lat + 0.005 };
  const groups = groupMapPlaces([first, same, distant], true);
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.find((g) => g.places.length === 2)?.places.map((p) => p.id),
    [first.id, same.id],
  );
  assert.ok(groups.some((g) => g.places[0].id === distant.id));
  for (const group of groups) {
    const polygon = previewCell(group.places[0]).polygon;
    assert.equal(group.lat, (polygon[0][1] + polygon[2][1]) / 2);
    assert.equal(group.lng, (polygon[0][0] + polygon[2][0]) / 2);
  }
});
test("a selected cell keeps the same member venues when changing between group and shop labels", () => {
  const places = recommendPlaces(localPlaces, "afternoon", "any", null);
  for (const group of groupMapPlaces(places, true)) {
    const selected = places.filter((p) => inMapScope(p, group.id));
    assert.deepEqual(
      selected.map((p) => p.id),
      group.places.map((p) => p.id),
    );
    assert.ok(selected.every((p) => inMapScope(p, `area:${p.area}`)));
  }
  assert.deepEqual(
    places.filter((p) => inMapScope(p, null)),
    places,
  );
  assert.deepEqual(
    places.filter((p) => inMapScope(p, "cell:unknown")),
    [],
  );
});
test("the recommendation collection excludes shopping and alley aggregates", () => {
  const ids = recommendPlaces(localPlaces, "afternoon", "any", null).map(
    (p) => p.id,
  );
  assert.ok(ids.length >= 15);
  assert.ok(!ids.includes("ssamziegil"));
  assert.ok(!ids.includes("nogari"));
});
test("time and activity select genuinely different example candidates", () => {
  const quiet = recommendPlaces(localPlaces, "afternoon", "quiet", null);
  const lively = recommendPlaces(localPlaces, "afternoon", "lively", null);
  assert.equal(quiet[0].id, "osulloc");
  assert.equal(lively[0].id, "layered");
  assert.ok(quiet.every((p) => !lively.some((q) => q.id === p.id)));
  const afternoonIds = recommendPlaces(
    localPlaces,
    "afternoon",
    "any",
    null,
  ).map((p) => p.id);
  const lunchIds = recommendPlaces(localPlaces, "lunch", "any", null).map(
    (p) => p.id,
  );
  assert.ok(afternoonIds.includes("osulloc"));
  assert.ok(!lunchIds.includes("osulloc"));
  const late = recommendPlaces(localPlaces, "late", "any", null);
  assert.ok(late.some((p) => p.id === "dalmaji"));
  assert.ok(!late.some((p) => p.id === "osulloc"));
  const allCandidates = new Set(
    ["lunch", "afternoon", "evening", "late"].flatMap((slot) =>
      recommendPlaces(
        localPlaces,
        slot as "lunch" | "afternoon" | "evening" | "late",
        "any",
        null,
      ).map((p) => p.id),
    ),
  );
  assert.equal(allCandidates.size, 20);
});
test("preview cells represent a single aligned 50m square per recommendation", () => {
  const p = localPlaces[0],
    cell = previewCell(p);
  const [a, b, c] = cell.polygon;
  assert.ok(
    Math.abs(
      distanceMeters({ lat: a[1], lng: a[0] }, { lat: b[1], lng: b[0] }) - 50,
    ) < 0.1,
  );
  assert.ok(
    Math.abs(
      distanceMeters({ lat: a[1], lng: a[0] }, { lat: c[1], lng: c[0] }) -
        Math.sqrt(5000),
    ) < 0.2,
  );
  assert.equal(previewCell(p).id, cell.id);
});
test("location distance works across Korean neighborhoods and for the same coordinate", () => {
  const p = localPlaces[0];
  assert.equal(distanceMeters(p, p), 0);
  const distance = distanceMeters(
    p,
    localPlaces.find((p) => p.id === "hanyakbang")!,
  );
  assert.ok(distance > 800 && distance < 1100);
  const nearest = recommendPlaces(
    localPlaces,
    "afternoon",
    "quiet",
    localPlaces.find((p) => p.id === "hanyakbang")!,
  );
  assert.equal(nearest[0].id, "hanyakbang");
});
