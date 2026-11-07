import assert from "node:assert/strict";
import { test } from "node:test";
import {
  previewDataSource,
  previewPlaceDetail,
} from "../src/features/discovery/data/preview.ts";
import { localPlaces } from "../src/features/discovery/data/preview/places.ts";
import {
  filterLocalPlaces,
  recommendPlaces,
} from "../src/features/discovery/data/preview/recommendations.ts";
import {
  copyDiscoveryQuery,
  discoveryQueryKey,
} from "../src/features/discovery/data/query.ts";
import type { DiscoveryQuery } from "../src/features/discovery/data/types.ts";

const base: DiscoveryQuery = {
  area: "jongno",
  category: "all",
  query: "",
  slot: "afternoon",
  activity: "any",
  origin: null,
  spaces: [],
};

test("preview query preserves results and ordering across all existing filters", () => {
  for (const area of [
    "all",
    "jongno",
    "ikseon",
    "insa",
    "eulji",
    "bukchon",
  ] as const)
    for (const category of ["all", "cafe", "food"] as const)
      for (const slot of ["lunch", "afternoon", "evening", "late"] as const)
        for (const activity of ["any", "quiet", "lively"] as const)
          for (const spaces of [[], ["hanok"], ["hanok", "retro"]] as const)
            for (const query of ["", "  청수당 ", "coffee", "no-match"])
              for (const origin of [null, { lat: 37.57, lng: 126.99 }]) {
                const input = {
                  area,
                  category,
                  slot,
                  activity,
                  spaces,
                  query,
                  origin,
                };
                const expected = recommendPlaces(
                  filterLocalPlaces(localPlaces, area, category, query),
                  slot,
                  activity,
                  origin,
                  spaces,
                );
                const actual = previewDataSource.snapshot!.query(input);
                assert.deepEqual(actual.items, expected);
                assert.equal(actual.total, expected.length);
                actual.items.forEach((place, i) =>
                  assert.equal(place, expected[i]),
                );
              }
});

test("preview date remains presentation-only and async port returns the same snapshot", async () => {
  const first = previewDataSource.snapshot!.query({
    ...base,
    visitDate: "2026-10-24",
  });
  const another = await previewDataSource.query({
    ...base,
    visitDate: "2026-10-30",
  });
  assert.deepEqual(first, another);
  assert.equal(previewDataSource.snapshot!.getPlace("missing"), null);
  assert.equal(await previewDataSource.getPlace("missing"), null);
  const place = await previewDataSource.getPlace("cheongsudang");
  assert.equal(place, previewDataSource.snapshot!.getPlace("cheongsudang"));
});

test("preview detail preserves gallery order, editorial summary and original description", () => {
  const detail = previewDataSource.snapshot!.getPlace("cheongsudang")!;
  assert.equal(detail.place, localPlaces[0]);
  assert.deepEqual(
    detail.photos.map((photo) => photo.kind),
    ["exterior", "interior", "menu"],
  );
  assert.equal(detail.sourceUrl, detail.place.sourceUrl);
  assert.deepEqual(detail.photoCredits, [
    ...new Set(detail.photos.map((photo) => photo.credit)),
  ]);
  assert.equal(
    detail.summaries.ko,
    "대나무와 돌길, 물길을 따라 들어가면 한옥 마당이 펼쳐져요. 익선동 골목을 걷다가 커피와 디저트로 쉬어 가기 좋은 공간입니다. 마당의 분위기도 함께 즐길 수 있도록 산책 중 여유를 두고 들러보세요.",
  );
  assert.equal(detail.descriptions.ko, detail.place.descriptionKo);
  assert.notEqual(detail.summaries.ja, detail.summaries.en);
  assert.equal(detail.summaries.ja, detail.descriptions.ja);
});

test("unknown fixture detail retains existing language and single-photo fallbacks", () => {
  const place = {
    ...localPlaces[0],
    id: "custom",
    summaryKo: "짧은 한국어 요약",
    summaryEn: "Short English summary",
    imageCredit: undefined,
    imageSourceUrl: undefined,
  };
  const detail = previewPlaceDetail(place);
  assert.equal(detail.summaries.ko, place.summaryKo);
  assert.equal(detail.summaries.en, place.summaryEn);
  assert.equal(detail.summaries.ja, place.summaryEn);
  assert.equal(detail.descriptions.zh, place.descriptionEn);
  assert.deepEqual(detail.photos, [
    {
      src: place.image,
      kind: "exterior",
      credit: "",
      sourceUrl: place.sourceUrl,
      imageUrl: place.sourceUrl,
    },
  ]);
});

test("preview async port rejects an already-cancelled request", async () => {
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    previewDataSource.query(base, { signal: abort.signal }),
    { name: "AbortError" },
  );
  await assert.rejects(
    previewDataSource.getPlace("cheongsudang", { signal: abort.signal }),
    { name: "AbortError" },
  );
});

test("fresh equivalent render inputs have a stable key and are copied for async work", () => {
  const input = {
    ...base,
    origin: { lat: 37.57, lng: 126.99 },
    spaces: ["hanok"] as const,
  };
  const copy = copyDiscoveryQuery(input);
  assert.equal(
    discoveryQueryKey(input),
    discoveryQueryKey({
      ...input,
      origin: { ...input.origin },
      spaces: [...input.spaces],
    }),
  );
  input.origin.lat += 1;
  assert.equal(copy.origin?.lat, 37.57);
  assert.notEqual(discoveryQueryKey(input), discoveryQueryKey(copy));
  assert.notEqual(
    discoveryQueryKey(copy),
    discoveryQueryKey({ ...copy, slot: "late" }),
  );
});
