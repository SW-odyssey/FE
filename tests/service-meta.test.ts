import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  areaCenter,
  hasDataset,
  invalidateServiceMeta,
  isServiceArea,
  loadServiceMeta,
  MissingDatasetError,
  parseServiceMeta,
  peekServiceMeta,
  selectDataset,
} from "../src/features/discovery/data/service-meta.ts";
import {
  areaLabel,
  formatReferenceMonth,
  readAreaParam,
} from "../src/features/discovery/presentation.ts";

// The shape published by GET /api/v2/meta on 2026-11-27 (BE #100).
const published = {
  datasets: [
    { id: "2025-11-fb0c7971545f", referenceMonth: "2025-11" },
    { id: "2025-12-f79ec9a78f73", referenceMonth: "2025-12" },
    { id: "2025-10-8fc9b30a8473", referenceMonth: "2025-10" },
  ],
  defaultDatasetId: "2025-11-fb0c7971545f",
  areas: [
    { id: "jongno", name: "종로", centerLat: 37.569507, centerLng: 126.988829 },
    {
      id: "ikseon",
      name: "익선동",
      centerLat: 37.573044,
      centerLng: 126.988991,
    },
    {
      id: "insadong",
      name: "인사동",
      centerLat: 37.573339,
      centerLng: 126.984739,
    },
    {
      id: "euljiro",
      name: "을지로",
      centerLat: 37.565748,
      centerLng: 126.99013,
    },
    {
      id: "myeongdong",
      name: "명동",
      centerLat: 37.563101,
      centerLng: 126.985092,
    },
  ],
  slotWindows: [
    { slot: "lunch", from: "11:00", toExclusive: "13:00", endsNextDay: false },
    {
      slot: "afternoon",
      from: "14:00",
      toExclusive: "17:00",
      endsNextDay: false,
    },
    { slot: "dinner", from: "18:00", toExclusive: "21:00", endsNextDay: false },
    {
      slot: "late_night",
      from: "22:00",
      toExclusive: "01:00",
      endsNextDay: true,
    },
  ],
  serviceHours: { from: "11:00", toExclusive: "01:00", endsNextDay: true },
};

beforeEach(invalidateServiceMeta);

test("the default dataset wins over array order and links keep a published batch", () => {
  const meta = parseServiceMeta(published);
  assert.equal(selectDataset(meta).id, "2025-11-fb0c7971545f");
  assert.equal(
    selectDataset(meta, "2025-10-8fc9b30a8473").referenceMonth,
    "2025-10",
  );
  assert.equal(selectDataset(meta, "retired").id, "2025-11-fb0c7971545f");
  assert.equal(hasDataset(meta, "retired"), false);
  const noDefault = parseServiceMeta({
    ...published,
    defaultDatasetId: "gone",
  });
  assert.equal(noDefault.defaultDatasetId, null);
  assert.equal(selectDataset(noDefault).id, "2025-12-f79ec9a78f73");
  assert.throws(
    () => selectDataset(parseServiceMeta({ ...published, datasets: [] })),
    MissingDatasetError,
  );
  assert.throws(() => selectDataset(parseServiceMeta({})), MissingDatasetError);
});

test("areas use server IDs and centres, with all as the logical centre", () => {
  const meta = parseServiceMeta({
    ...published,
    areas: [
      ...published.areas,
      { id: "broken", name: "x", centerLat: "37", centerLng: 126 },
      { id: "all", name: "전체", centerLat: 37, centerLng: 126 },
    ],
  });
  assert.deepEqual(
    meta.areas.map(({ id }) => id),
    ["jongno", "ikseon", "insadong", "euljiro", "myeongdong"],
  );
  assert.deepEqual(areaCenter(meta, "myeongdong"), {
    lat: 37.563101,
    lng: 126.985092,
  });
  assert.deepEqual(areaCenter(meta, "all"), {
    lat: 37.568948,
    lng: 126.987556,
  });
  assert.equal(isServiceArea(meta, "myeongdong"), true);
  assert.equal(isServiceArea(meta, "all"), true);
  assert.equal(isServiceArea(meta, "bukchon"), false);
  assert.equal(areaCenter(parseServiceMeta({}), "jongno"), null);
});

test("slot windows and service hours are kept for the time rules", () => {
  const meta = parseServiceMeta(published);
  assert.deepEqual(
    meta.slotWindows.map(({ slot, from, toExclusive }) => [
      slot,
      from,
      toExclusive,
    ]),
    [
      ["lunch", "11:00", "13:00"],
      ["afternoon", "14:00", "17:00"],
      ["evening", "18:00", "21:00"],
      ["late", "22:00", "01:00"],
    ],
  );
  assert.equal(meta.slotWindows[3]?.endsNextDay, true);
  assert.deepEqual(meta.serviceHours, published.serviceHours);
});

test("one meta request is shared, a failure can be retried and an abort leaves it running", async (t) => {
  let calls = 0;
  let fail = true;
  t.mock.method(globalThis, "fetch", async () => {
    calls += 1;
    if (fail) return new Response(null, { status: 503 });
    return Response.json({ success: true, data: published });
  });
  await assert.rejects(loadServiceMeta());
  fail = false;
  const aborted = new AbortController();
  const waiting = loadServiceMeta(aborted.signal);
  const [list, course] = await Promise.all([
    loadServiceMeta(),
    loadServiceMeta(),
  ]);
  aborted.abort();
  await waiting.catch(() => undefined);
  assert.equal(list, course);
  assert.equal(calls, 2);
  assert.equal(peekServiceMeta(), list);
  await loadServiceMeta();
  assert.equal(calls, 2);
  invalidateServiceMeta();
  await loadServiceMeta();
  assert.equal(calls, 3);
});

test("old area links move to server IDs and Bukchon opens all areas", () => {
  assert.equal(readAreaParam("insa"), "insadong");
  assert.equal(readAreaParam("eulji"), "euljiro");
  assert.equal(readAreaParam("bukchon"), "all");
  assert.equal(readAreaParam("myeongdong"), "myeongdong");
  assert.equal(readAreaParam("../x"), "all");
  assert.equal(readAreaParam("unknown"), "all");
  assert.equal(readAreaParam(null), "all");
});

test("area names and the reference month are shown in four languages", () => {
  assert.deepEqual(
    (["en", "ko", "ja", "zh"] as const).map((language) =>
      areaLabel("myeongdong", language),
    ),
    ["Myeongdong", "명동", "明洞", "明洞"],
  );
  assert.equal(areaLabel("seochon", "en", "서촌"), "서촌");
  assert.deepEqual(
    (["en", "ko", "ja", "zh"] as const).map((language) =>
      formatReferenceMonth("2025-12", language),
    ),
    [
      "LG U+ data as of Dec 2025",
      "LG U+ 2025년 12월 데이터 기준",
      "LG U+ 2025年12月時点のデータ",
      "LG U+ 2025年12月数据",
    ],
  );
});
