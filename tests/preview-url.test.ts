import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import {
  readPreviewUrl,
  serializePreviewUrl,
  type PreviewUrlSelection,
} from "../src/features/discovery/state/preview-url.ts";

const now = new Date("2026-10-24T06:20:00.000Z");
const defaults: PreviewUrlSelection = {
  view: "discover",
  area: "jongno",
  place: null,
  language: "en",
  query: "",
  category: "all",
  autoTime: true,
  slot: "afternoon",
  day: 0,
  activity: "any",
  spaces: [],
  modal: null,
  sheet: "half",
};

test("an empty URL restores Jongno, automatic time and the default language", () => {
  assert.deepEqual(readPreviewUrl("", now, null), {
    ...defaults,
    currentArea: true,
    sheet: undefined,
    slot: undefined,
    draftTime: { autoTime: true, day: 0, slot: "afternoon" },
  });
  assert.equal(
    serializePreviewUrl(defaults).toString(),
    "view=discover&area=jongno",
  );
});

test("a map detail link restores its date, filters, modal and sheet", () => {
  const state = readPreviewUrl(
    "?view=map&area=ikseon&place=cheongsudang&lang=ko&q=%EC%B2%AD+%EC%88%98%EB%8B%B9&category=cafe&slot=late&day=6&activity=quiet&space=retro,hanok,unknown,retro&panel=filters&sheet=expanded",
    now,
    "ja",
  );
  assert.deepEqual(state, {
    view: "map",
    area: "ikseon",
    currentArea: false,
    place: "cheongsudang",
    modal: "filters",
    sheet: "expanded",
    query: "청 수당",
    autoTime: false,
    slot: "late",
    day: 6,
    draftTime: { autoTime: false, day: 6, slot: "late" },
    activity: "quiet",
    spaces: ["hanok", "retro"],
    category: "cafe",
    language: "ko",
  });
});

test("URL language takes precedence, including an explicitly invalid language", () => {
  for (const language of ["en", "ko", "ja", "zh"]) {
    assert.equal(readPreviewUrl("", now, language).language, language);
    assert.equal(
      readPreviewUrl(`?lang=${language}`, now, "zh").language,
      language,
    );
  }
  for (const language of ["", "fr", "KO"]) {
    assert.equal(readPreviewUrl(`?lang=${language}`, now, "ja").language, "en");
    assert.equal(readPreviewUrl("", now, language).language, "en");
  }
});

test("only a missing area or Jongno restores the current-area flag", () => {
  for (const search of ["", "?area=jongno"]) {
    const state = readPreviewUrl(search, now, null);
    assert.equal(state.area, "jongno");
    assert.equal(state.currentArea, true);
  }
  for (const area of ["", "unknown", "all"]) {
    const state = readPreviewUrl(`?area=${area}`, now, null);
    assert.equal(state.area, "all");
    assert.equal(state.currentArea, false);
  }
  for (const area of ["ikseon", "insa", "eulji", "bukchon"]) {
    const state = readPreviewUrl(`?area=${area}`, now, null);
    assert.equal(state.area, area);
    assert.equal(state.currentArea, false);
  }
});

test("invalid values retain the controller's fallbacks and leave place validation to its data source", () => {
  const state = readPreviewUrl(
    "?view=course&area=unknown&place=nogari&panel=other&sheet=full&slot=dinner&day=oops&activity=moderate&category=culture&space=unknown&lang=fr&q=++",
    now,
    "ko",
  );
  assert.deepEqual(state, {
    view: "discover",
    area: "all",
    currentArea: false,
    place: "nogari",
    modal: null,
    sheet: undefined,
    query: "  ",
    autoTime: true,
    slot: undefined,
    day: 0,
    draftTime: { autoTime: true, day: 0, slot: "afternoon" },
    activity: "any",
    spaces: [],
    category: "all",
    language: "en",
  });
});

test("day restoration preserves numeric coercion and clamps only to zero through six", () => {
  for (const [value, day] of [
    ["", 0],
    ["NaN", 0],
    ["-2", 0],
    ["Infinity", 6],
    ["-Infinity", 0],
    ["12", 6],
    ["1.5", 1.5],
    ["6", 6],
  ] as const) {
    const state = readPreviewUrl(`?slot=evening&day=${value}`, now, null);
    assert.equal(state.day, day, value);
    assert.equal(state.draftTime.day, day, value);
  }
});

test("automatic draft slots use the supplied clock and explicit slots override it", () => {
  for (const [hour, slot] of [
    [0, "late"],
    [4, "late"],
    [5, "lunch"],
    [13, "lunch"],
    [14, "afternoon"],
    [17, "afternoon"],
    [18, "evening"],
    [21, "evening"],
    [22, "late"],
  ] as const) {
    const clock = new Date(Date.UTC(2026, 9, 24, hour - 9));
    const before = clock.getTime();
    const state = readPreviewUrl("?slot=invalid&day=3", clock, null);
    assert.equal(state.slot, undefined);
    assert.equal(state.autoTime, true);
    assert.deepEqual(state.draftTime, { autoTime: true, day: 3, slot });
    assert.equal(clock.getTime(), before);
  }
  for (const slot of ["lunch", "afternoon", "evening", "late"] as const) {
    const state = readPreviewUrl(`?slot=${slot}`, now, null);
    assert.equal(state.slot, slot);
    assert.equal(state.autoTime, false);
    assert.equal(state.draftTime.slot, slot);
  }
});

test("valid panel and sheet values restore independently of the active view", () => {
  for (const modal of ["area", "filters", "time", "menu"] as const) {
    for (const sheet of ["collapsed", "half", "expanded"] as const) {
      const state = readPreviewUrl(`?panel=${modal}&sheet=${sheet}`, now, null);
      assert.equal(state.view, "discover");
      assert.equal(state.modal, modal);
      assert.equal(state.sheet, sheet);
    }
  }
  const previousSheet = "expanded";
  for (const search of ["", "?sheet=invalid", "?sheet="]) {
    assert.equal(
      readPreviewUrl(search, now, null).sheet ?? previousSheet,
      previousSheet,
    );
  }
});

test("serialization keeps the exact replacement key order and URL encoding", () => {
  const state: PreviewUrlSelection = {
    ...defaults,
    view: "map",
    area: "ikseon",
    place: "cheongsudang",
    language: "ko",
    query: "청 수당&tea",
    category: "cafe",
    autoTime: false,
    slot: "late",
    day: 6,
    activity: "quiet",
    spaces: ["hanok", "retro"],
    modal: "filters",
    sheet: "expanded",
  };
  assert.equal(
    serializePreviewUrl(state).toString(),
    "view=map&area=ikseon&place=cheongsudang&lang=ko&q=%EC%B2%AD+%EC%88%98%EB%8B%B9%26tea&category=cafe&slot=late&day=6&activity=quiet&space=hanok%2Cretro&panel=filters&sheet=expanded",
  );
  assert.deepEqual(state.spaces, ["hanok", "retro"]);
});

test("automatic time omits both date keys and discover view omits the sheet", () => {
  const params = serializePreviewUrl({
    ...defaults,
    place: "",
    slot: "late",
    day: 6,
    sheet: "expanded",
  });
  assert.equal(params.toString(), "view=discover&area=jongno");
  const state = readPreviewUrl(params.toString(), now, null);
  assert.equal(state.autoTime, true);
  assert.equal(state.day, 0);
  assert.equal(state.slot, undefined);
});

test("back navigation restores the earlier map, date and filter URL without later state leaking in", () => {
  const earlier: PreviewUrlSelection = {
    ...defaults,
    view: "map",
    area: "eulji",
    language: "ja",
    query: "coffee",
    category: "food",
    autoTime: false,
    slot: "evening",
    day: 6,
    activity: "lively",
    spaces: ["courtyard", "cozy"],
    sheet: "collapsed",
  };
  const history = [
    serializePreviewUrl(earlier).toString(),
    serializePreviewUrl({
      ...earlier,
      place: "hanyakbang",
      modal: "menu",
    }).toString(),
  ];
  const detail = readPreviewUrl(history[1], now, "ko");
  assert.equal(detail.place, "hanyakbang");
  assert.equal(detail.modal, "menu");
  const restored = readPreviewUrl(history[0], now, "ko");
  assert.deepEqual(restored, {
    ...earlier,
    currentArea: false,
    draftTime: { autoTime: false, day: 6, slot: "evening" },
  });
  assert.equal(
    serializePreviewUrl({ ...earlier, ...restored }).toString(),
    history[0],
  );
});

test("automatic draft slots stay on Seoul time across device timezones", () => {
  const moduleUrl = new URL(
    "../src/features/discovery/state/preview-url.ts",
    import.meta.url,
  ).href;
  const script = `import { readPreviewUrl } from ${JSON.stringify(moduleUrl)};
const times = ['2026-10-24T04:59:00Z', '2026-10-24T05:00:00Z', '2026-10-24T09:00:00Z', '2026-10-24T13:00:00Z', '2026-12-31T15:30:00Z'];
process.stdout.write(JSON.stringify(times.map(time => readPreviewUrl('?slot=invalid', new Date(time), null).draftTime.slot)));`;
  for (const timezone of [
    "UTC",
    "Asia/Seoul",
    "America/Los_Angeles",
    "Pacific/Kiritimati",
  ]) {
    const result = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", script],
      {
        env: { ...process.env, TZ: timezone },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    assert.deepEqual(
      JSON.parse(result),
      ["lunch", "afternoon", "evening", "late", "late"],
      timezone,
    );
  }
});

test("duplicate query keys use their first value, matching URLSearchParams restoration", () => {
  const state = readPreviewUrl(
    "?view=map&view=discover&area=insa&area=jongno&lang=zh&lang=ko&slot=lunch&slot=late&day=2&day=5&q=first&q=second&space=retro&space=hanok",
    now,
    null,
  );
  assert.equal(state.view, "map");
  assert.equal(state.area, "insa");
  assert.equal(state.language, "zh");
  assert.equal(state.slot, "lunch");
  assert.equal(state.day, 2);
  assert.equal(state.query, "first");
  assert.deepEqual(state.spaces, ["retro"]);
});
