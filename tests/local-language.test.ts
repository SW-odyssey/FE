import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { localPlaces } from "../src/features/discovery/data/preview/places.ts";
import {
  languageNames,
  languages,
  localizedPlaceSummary,
  localText,
  placeCount,
} from "../src/features/discovery/localization.ts";
import { readDiscoveryUrl } from "../src/features/discovery/state/url-state.ts";

test("all four language choices survive deep links and have native names", () => {
  assert.deepEqual(languages, ["ko", "en", "ja", "zh"]);
  for (const lang of languages) {
    assert.equal(readDiscoveryUrl(`?lang=${lang}`).language, lang);
    assert.ok(languageNames[lang]);
  }
  assert.equal(readDiscoveryUrl("?lang=unsupported").language, "en");
});

test("Japanese and Chinese localize controls, counts and every launch venue summary", () => {
  const launch = localPlaces.filter(
    (p) => p.category !== "culture" && p.id !== "nogari",
  );
  assert.equal(launch.length, 20);
  for (const lang of ["ja", "zh"] as const) {
    for (const key of [
      "Language",
      "Filters",
      "Search places",
      "AI summary",
      "View on map",
      "Next photo",
    ]) {
      assert.notEqual(localText(lang, key, "한국어"), key);
    }
    assert.ok(placeCount(lang, 7, true).includes("7"));
    assert.ok(!placeCount(lang, 7, true).includes("places"));
    for (const p of launch) {
      const text = localizedPlaceSummary(p.id, lang);
      assert.ok(text && text.length > 30, `${p.id} missing ${lang} summary`);
    }
  }
});

test("each launch venue has two or three distinct real photo files with source attribution", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        "../src/features/discovery/data/preview/guide-photos.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const launch = localPlaces.filter(
    (p) => p.category !== "culture" && p.id !== "nogari",
  );
  for (const place of launch) {
    const photos = manifest[place.id];
    assert.ok(photos.length >= 2 && photos.length <= 3, place.id);
    const hashes = new Set();
    for (const photo of photos) {
      assert.ok(["exterior", "interior", "menu"].includes(photo.kind));
      assert.ok(
        photo.credit &&
          photo.sourceUrl.startsWith("https://") &&
          photo.imageUrl.startsWith("https://"),
      );
      const path = new URL(`../public${photo.src}`, import.meta.url);
      assert.ok(statSync(path).size > 1000);
      hashes.add(createHash("sha256").update(readFileSync(path)).digest("hex"));
    }
    assert.equal(
      hashes.size,
      photos.length,
      `${place.id} repeats the same photo`,
    );
  }
});
