import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampPhotoIndex,
  resolveGalleryIndex,
} from "../src/features/discovery/gallery-selection.ts";

test("photo refresh preserves the displayed source after an insertion or reorder", () => {
  const before = ["exterior.jpg", "room.jpg", "coffee.jpg"];
  assert.equal(
    resolveGalleryIndex(1, before, ["coffee.jpg", "exterior.jpg", "room.jpg"]),
    2,
  );
  assert.equal(resolveGalleryIndex(2, before, ["new.jpg", ...before]), 3);
  assert.equal(resolveGalleryIndex(1, before, [...before]), 1);
});

test("a removed photo, shrinking collection and empty-to-loaded transition stay bounded", () => {
  const before = ["exterior.jpg", "room.jpg", "coffee.jpg"];
  assert.equal(resolveGalleryIndex(2, before, ["exterior.jpg"]), 0);
  assert.equal(resolveGalleryIndex(2, before, []), 0);
  assert.equal(resolveGalleryIndex(0, [], ["new.jpg"]), 0);
  assert.equal(
    resolveGalleryIndex(1, before, ["new-exterior.jpg", "new-room.jpg"]),
    1,
  );
});

test("overscroll and an unavailable viewport width cannot produce an invalid selection", () => {
  assert.equal(clampPhotoIndex(-1, 3), 0);
  assert.equal(clampPhotoIndex(5, 3), 2);
  assert.equal(clampPhotoIndex(Number.NaN, 3), 0);
  assert.equal(clampPhotoIndex(Number.POSITIVE_INFINITY, 3), 0);
  assert.equal(clampPhotoIndex(0, 0), 0);
});
