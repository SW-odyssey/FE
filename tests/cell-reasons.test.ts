import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cellReasonChip,
  cellReasonText,
  parseCellReasons,
  type CellReasonCode,
} from "../src/features/discovery/cell-reasons.ts";

const codes: CellReasonCode[] = [
  "VISIT_RELATIVE_HIGH",
  "DAY_DISTINCT",
  "TIME_PEAK",
  "STAY_DISTINCT",
  "WALK_DISTINCT",
  "AGE20_DISTINCT",
  "AGE30_DISTINCT",
];

test("every cell reason has a chip and a sentence in four languages", () => {
  for (const code of codes)
    for (const language of ["en", "ko", "ja", "zh"] as const) {
      assert.ok(cellReasonChip(code, language).length > 0);
      assert.ok(cellReasonText(code, language).length > 0);
      // The comparison is with all cells, not only nearby ones (BE contract).
      assert.doesNotMatch(cellReasonText(code, language), /nearby|주변|近く/);
    }
  assert.equal(cellReasonChip("TIME_PEAK", "ko"), "이 시간대에 두드러짐");
  // Age codes say they are not the store's customer mix.
  assert.match(cellReasonText("AGE20_DISTINCT", "ko"), /연령 비율은 아니에요/);
  assert.match(cellReasonText("AGE30_DISTINCT", "en"), /not the store/);
});

test("only available cells with known codes are kept, at most two", () => {
  assert.deepEqual(
    parseCellReasons({
      "1": {
        status: "AVAILABLE",
        reasons: [
          { code: "TIME_PEAK" },
          { code: "DAY_DISTINCT" },
          { code: "WALK_DISTINCT" },
        ],
      },
      "2": { status: "AVAILABLE", reasons: [{ code: "UNKNOWN" }] },
      "3": { status: "INCOMPLETE", reasons: [{ code: "TIME_PEAK" }] },
      "4": null,
      "5": { status: "AVAILABLE", reasons: "TIME_PEAK" },
    }),
    { "1": ["TIME_PEAK", "DAY_DISTINCT"] },
  );
  assert.deepEqual(parseCellReasons(undefined), {});
  assert.deepEqual(parseCellReasons([]), {});
});
