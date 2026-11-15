import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkedPage,
  liveCheck,
  publicLink,
  restaurant,
  weekdayGroup,
  peerComparison,
  historicalPatterns,
} from "../src/features/recommendation-review/contract.ts";
import type { ReviewCondition } from "../src/features/recommendation-review/types.ts";

const condition: ReviewCondition = {
  id: "weekday_lunch",
  label: { ko: "월요일 점심", en: "Monday lunch", ja: "月曜日・昼食" },
  date: "2026-11-16",
  slot: "lunch",
  density: "any",
  request: { areaId: "jongno" },
};
const target = {
  id: 10,
  name: "검토 식당",
  category: "food" as const,
  foodType: "korean" as const,
  areaId: "jongno",
  cellId: 100,
  googlePlaceId: "ChIJtest",
};
const payload = (items: unknown[], page = 0) => ({
  success: true,
  data: {
    applied: { visitDate: condition.date, slot: "lunch", dayType: "mon_thu" },
    page,
    hasNext: true,
    items,
  },
});

test("fresh API positions preserve the server order and page offset", () => {
  const first = {
    ...target,
    id: 11,
    name: "먼저 나온 식당",
    googlePlaceId: "ChIJfirst",
  };
  const page = checkedPage(payload([first, target], 2), condition, 2);
  const result = liveCheck([page], target, "2026-11-15T00:00:00Z");
  assert.equal(result.rank, 62);
  assert.equal(result.status, "confirmed");
});

test("a restaurant missing from sampled pages is never declared globally excluded", () => {
  const result = liveCheck(
    [checkedPage(payload([]), condition, 0)],
    target,
    "2026-11-15T00:00:00Z",
  );
  assert.equal(result.status, "not_seen_in_checked_pages");
  assert.equal(result.rank, null);
});

test("a reused ID with a changed place or grid cannot receive the stored context", () => {
  for (const changed of [
    { ...target, cellId: 101 },
    { ...target, googlePlaceId: "ChIJother" },
    { ...target, name: "다른 식당" },
  ]) {
    const page = checkedPage(payload([changed]), condition, 0);
    assert.throws(
      () => liveCheck([page], target, "2026-11-15T00:00:00Z"),
      /IDENTITY_CHANGED/,
    );
  }
});

test("date, slot and pagination drift fail instead of displaying an old ranking", () => {
  const wrongDay = payload([target]);
  wrongDay.data.applied.visitDate = "2026-11-17";
  const wrongSlot = payload([target]);
  wrongSlot.data.applied.slot = "dinner";
  for (const value of [wrongDay, wrongSlot, payload([target], 1)])
    assert.throws(() => checkedPage(value, condition, 0), /SCOPE_OR_PAGE/);
});

test("duplicate restaurants and non-food categories are rejected", () => {
  assert.throws(
    () => checkedPage(payload([target, target]), condition, 0),
    /DUPLICATE/,
  );
  assert.throws(() => restaurant({ ...target, category: "cafe" }), /IDENTITY/);
});

test("provider links cannot inject script, credentials or local schemes", () => {
  for (const link of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///x",
    "https://user:password@example.com/",
  ])
    assert.equal(publicLink(link), undefined);
  assert.equal(
    publicLink("https://maps.google.com/"),
    "https://maps.google.com/",
  );
});

test("weekday groups and area are verified independently of a matching date and slot", () => {
  const wrongGroup = payload([target]);
  wrongGroup.data.applied.dayType = "sat";
  assert.throws(() => checkedPage(wrongGroup, condition, 0), /SCOPE_OR_PAGE/);
  assert.throws(
    () =>
      checkedPage(payload([{ ...target, areaId: "euljiro" }]), condition, 0),
    /AREA_MISMATCH/,
  );
  assert.equal(weekdayGroup("2026-11-20"), "FRI");
  assert.equal(weekdayGroup("2026-11-21"), "SAT");
  assert.equal(weekdayGroup("2026-11-22"), "SUN");
  assert.throws(() => weekdayGroup("2026-02-30"), /CALENDAR/);
});

test("same-area time comparisons cannot be presented as an advantage over other candidates", () => {
  const peer = {
    status: "distinct",
    methodVersion: "same_condition_peers_v1",
    unit: "other_candidate_grids",
    expectedPeerAreas: 20,
    observedPeerAreas: 20,
    feature: "visitor",
    texts: { ko: "비교", en: "comparison", ja: "比較" },
    decisionTexts: { ko: "검토", en: "consider", ja: "確認" },
  };
  assert.throws(
    () => peerComparison(peer, true, true, { kind: "own_time_comparison" }),
    /ADVANTAGE_NOT_SUPPORTED/,
  );
  assert.throws(
    () =>
      peerComparison(peer, false, true, {
        kind: "same_condition_peer_comparison",
      }),
    /ADVANTAGE_NOT_SUPPORTED/,
  );
  assert.equal(
    peerComparison(peer, true, true, { kind: "same_condition_peer_comparison" })
      .status,
    "distinct",
  );
});

test("a missing peer observation does not become a completed comparison or a global exclusion", () => {
  const peer = {
    status: "distinct",
    methodVersion: "same_condition_peers_v1",
    unit: "other_candidate_grids",
    expectedPeerAreas: 20,
    observedPeerAreas: 10,
    feature: "visitor",
    texts: { ko: "비교", en: "comparison", ja: "比較" },
    decisionTexts: { ko: "검토", en: "consider", ja: "確認" },
  };
  assert.throws(
    () =>
      peerComparison(peer, true, true, {
        kind: "same_condition_peer_comparison",
      }),
    /ADVANTAGE_NOT_SUPPORTED/,
  );
  assert.throws(
    () =>
      peerComparison(
        { ...peer, status: "not_recommended", feature: null },
        false,
        false,
        null,
      ),
    /EXCLUSION_NOT_VERIFIED/,
  );
});

test("the historical plot accepts four coarse windows and rejects invented hours or zero-filled missing data", () => {
  const data = {
    sourceYear: 2025,
    measure: "surrounding_domestic_20s_30s_visitor_indicator",
    normalization: "per_day_maximum_not_comparable_between_places",
    slots: ["LUNCH", "AFTERNOON", "DINNER", "LATE_NIGHT"],
    sourceArtifact: "derived.pkl",
    months: [
      {
        month: 11,
        days: ["MON_THU", "FRI", "SAT", "SUN"].map((dayGroup) => ({
          dayGroup,
          status: "available",
          bars: [100, 50, 30, 20],
          peakSlots: ["LUNCH"],
        })),
      },
    ],
  };
  assert.equal(historicalPatterns(data, 2025).months.length, 1);
  assert.throws(
    () =>
      historicalPatterns({ ...data, slots: ["10", "11", "12", "13"] }, 2025),
    /HISTORICAL_PATTERN/,
  );
  const missing = structuredClone(data);
  missing.months[0].days[0].status = "incomplete";
  assert.throws(() => historicalPatterns(missing, 2025), /MUST_NOT_BE_ZERO/);
});
