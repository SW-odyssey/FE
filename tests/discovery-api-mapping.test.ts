import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapApiIdToDiscovery,
  mapDiscoveryIdToApi,
  mapDiscoveryQueryToApi,
  serializeApiRecommendationsQuery,
} from "../src/features/discovery/data/api-mapping.ts";
import type { DiscoveryQuery } from "../src/features/discovery/data/types.ts";

const input: DiscoveryQuery = {
  area: "insa",
  category: "food",
  query: "공평",
  slot: "evening",
  activity: "quiet",
  origin: null,
  spaces: [],
  visitDate: "2026-10-25",
};

test("known preview choices map to the exact eight server query keys", () => {
  const result = mapDiscoveryQueryToApi(input, {
    foodType: "korean",
    since: "20",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value, {
    areaId: "insadong",
    category: "food",
    foodType: "korean",
    since: "20",
    visitDate: "2026-10-25",
    slot: "dinner",
    density: "less_busy",
    q: "공평",
  });
  const params = new URLSearchParams(
    serializeApiRecommendationsQuery(result.value),
  );
  assert.deepEqual(
    [...params.keys()],
    [
      "areaId",
      "category",
      "foodType",
      "since",
      "visitDate",
      "slot",
      "density",
      "q",
    ],
  );
  assert.equal(params.get("q"), "공평");
});

test("cafe mapping uses no food-only, preview space or language parameters", () => {
  const result = mapDiscoveryQueryToApi({
    ...input,
    area: "eulji",
    category: "cafe",
    slot: "late",
    activity: "any",
    origin: { lat: 37.57, lng: 126.99 },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.areaId, "euljiro");
  assert.equal(result.value.slot, "late_night");
  assert.equal(result.value.density, "any");
  const params = new URLSearchParams(
    serializeApiRecommendationsQuery(result.value),
  );
  for (const unsupported of [
    "foodType",
    "since",
    "space",
    "activity",
    "origin",
    "lang",
  ])
    assert.equal(params.has(unsupported), false);
});

test("unresolved Bukchon, culture and concept selections cannot masquerade as supported API filters", () => {
  const result = mapDiscoveryQueryToApi({
    ...input,
    area: "bukchon",
    category: "culture",
    spaces: ["hanok"],
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(
    result.issues.map((issue) => issue.field),
    ["area", "category", "spaces"],
  );
});

test("the API mapper requires an explicit valid date and never derives browser local time", () => {
  for (const visitDate of [undefined, "2026-02-30", "tomorrow"]) {
    const result = mapDiscoveryQueryToApi({ ...input, visitDate });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.issues[0].field, "visitDate");
  }
});

test("server numeric IDs round-trip through the UI model without treating fixture slugs as API IDs", () => {
  assert.equal(mapApiIdToDiscovery(412), "412");
  assert.deepEqual(mapDiscoveryIdToApi("412"), { ok: true, value: 412 });
  assert.equal(mapDiscoveryIdToApi("cheongsudang").ok, false);
  assert.equal(mapDiscoveryIdToApi("9007199254740993").ok, false);
  assert.throws(() => mapApiIdToDiscovery(Number.NaN), TypeError);
});
