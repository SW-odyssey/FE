import assert from "node:assert/strict";
import { test } from "node:test";
import { localText } from "../src/features/discovery/localization.ts";
import {
  formatNearbyCount,
  nearbyRadiusMeters,
} from "../src/features/discovery/presentation.ts";

const languages = ["en", "ko", "ja", "zh"] as const;

test("the map re-search names the 300 m centre radius in four languages", () => {
  assert.equal(nearbyRadiusMeters, 300);
  const labels = languages.map((language) =>
    localText(
      language,
      "Search 300 m around the map centre",
      "지도 중심 300m 안에서 다시 검색",
    ),
  );
  assert.deepEqual(labels, [
    "Search 300 m around the map centre",
    "지도 중심 300m 안에서 다시 검색",
    "中心300m以内を再検索",
    "搜索地图中心300米内",
  ]);
  for (const label of labels) {
    assert.match(label, /300/);
    assert.doesNotMatch(label, /this area|이 지도에서|このエリア|此区域/);
  }
});

test("nearby results say which point and radius they came from", () => {
  assert.deepEqual(
    languages.map((language) => formatNearbyCount("map", 12, language)),
    [
      "12 places within 300 m of the map centre",
      "지도 중심 300m 안 12곳",
      "地図の中心から300m以内 12件",
      "地图中心300米内 共12家",
    ],
  );
  assert.equal(formatNearbyCount("location", 0, "ko"), "내 위치 300m 안 0곳");
});
