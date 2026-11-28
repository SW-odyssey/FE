import assert from "node:assert/strict";
import { test } from "node:test";
import { mapApiIdToDiscovery } from "../src/features/discovery/data/api-mapping.ts";
import { v2Time } from "../src/features/discovery/data/v2-client.ts";

test("server numeric IDs become UI strings and invalid IDs are rejected", () => {
  assert.equal(mapApiIdToDiscovery(412), "412");
  for (const id of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => mapApiIdToDiscovery(id), TypeError);
  }
});

test("screen slots map to the v2 slot names with the Seoul weekday", () => {
  assert.deepEqual(v2Time("2026-11-27", "lunch"), {
    weekday: "fri",
    slot: "lunch",
  });
  assert.equal(v2Time("2026-11-27", "afternoon").slot, "afternoon");
  assert.equal(v2Time("2026-11-27", "evening").slot, "dinner");
  assert.equal(v2Time("2026-11-27", "late").slot, "late_night");
  assert.throws(() => v2Time("not-a-date", "lunch"));
});
