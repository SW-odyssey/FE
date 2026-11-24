import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  suggestPlaces,
  type PlaceSearchEntry,
} from "../src/features/discovery/data/place-search.ts";

const places: PlaceSearchEntry[] = [
  { id: 1, ko: "숯불 감자탕", en: "Charcoal stew", zh: null, ja: null },
  {
    id: 2,
    ko: "감자탕 본점",
    en: "Gamjatang Main",
    zh: "土豆汤总店",
    ja: null,
  },
  { id: 3, ko: "감자탕", en: "Gamjatang", zh: "土豆汤", ja: "カムジャタン" },
];

test("다른 언어로 검색해도 선택 언어의 상호를 보여준다", () => {
  const result = suggestPlaces(places, " Ｇａｍｊａｔａｎｇ ", "ja");
  assert.deepEqual(
    result.map(({ id, name }) => [id, name]),
    [
      [3, "カムジャタン"],
      [2, "감자탕 본점"],
    ],
  );
});

test("공백을 무시하고 전체 일치, 시작 부분 일치, 포함 순으로 보여준다", () => {
  assert.deepEqual(
    suggestPlaces(places, "감자 탕", "ko").map(({ id }) => id),
    [3, 2, 1],
  );
  assert.deepEqual(suggestPlaces(places, "  ", "ko"), []);
});

test("여러 언어가 일치해도 매장마다 한 번씩 최대 여섯 개를 보여준다", () => {
  const entries = Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    ko: "Coffee",
    en: "Coffee",
    ja: null,
    zh: null,
  }));
  assert.deepEqual(
    suggestPlaces(entries, "coffee", "en").map(({ id }) => id),
    [1, 2, 3, 4, 5, 6],
  );
});

test("공개 사전에서 반미를 Banh Mi로 찾고 죽 상호를 일본어로 표시한다", () => {
  const dictionary = JSON.parse(
    readFileSync(
      new URL("../public/data/place-search.json", import.meta.url),
      "utf8",
    ),
  ) as PlaceSearchEntry[];

  for (const [language, expected] of [
    ["en", "Be Kind Banh Mi"],
    ["zh", "Be Kind 越南法棍三明治"],
    ["ja", "ビー・カインド バインミー"],
  ] as const) {
    const match = suggestPlaces(dictionary, "Banh Mi", language).find(
      ({ id }) => id === 1935,
    );
    assert.equal(match?.name, expected);
  }

  const porridge = suggestPlaces(dictionary, "죽이 최고야", "ja").find(
    ({ id }) => id === 2250,
  );
  assert.equal(porridge?.name, "お粥が一番");
});
