import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resistSheetHeight,
  sheetSnapTarget,
  stepSheetSpring,
} from "../src/features/map/sheet-motion.ts";

test("a slow drag settles at the nearest stop, including the middle stop", () => {
  assert.equal(sheetSnapTarget(210, 0, 88), 320);
  assert.equal(sheetSnapTarget(300, 0, 320), 320);
  assert.equal(sheetSnapTarget(430, 0, 320), 500);
  assert.equal(sheetSnapTarget(185, 0, 320), 88);
});

test("a short flick advances a stop and direction reversals follow the release velocity", () => {
  assert.equal(sheetSnapTarget(170, 0.7, 88), 320);
  assert.equal(sheetSnapTarget(345, 0.8, 320), 500);
  assert.equal(sheetSnapTarget(460, -0.7, 500), 320);
  assert.equal(sheetSnapTarget(200, -0.7, 320), 88);
  assert.equal(sheetSnapTarget(93, 1.5, 88), 88);
});

test("resistance is continuous and bounded at both ends", () => {
  assert.equal(resistSheetHeight(88), 88);
  assert.equal(resistSheetHeight(320), 320);
  assert.equal(resistSheetHeight(500), 500);
  assert.ok(resistSheetHeight(40) > 68 && resistSheetHeight(40) < 88);
  assert.ok(resistSheetHeight(700) > 500 && resistSheetHeight(700) < 520);
  assert.ok(resistSheetHeight(700, 432) < 452);
  assert.equal(sheetSnapTarget(410, 1, 432, 432), 432);
});

test("the spring is frame-rate independent, converges, and can reverse mid-flight", () => {
  const once = stepSheetSpring(88, 0, 500, 0.032);
  const first = stepSheetSpring(88, 0, 500, 0.016);
  const twice = stepSheetSpring(first.position, first.velocity, 500, 0.016);
  assert.ok(Math.abs(once.position - twice.position) < 0.0001);
  let value = { position: 88, velocity: 0 };
  for (let frame = 0; frame < 60; frame++)
    value = stepSheetSpring(value.position, value.velocity, 500, 1 / 60);
  assert.ok(Math.abs(value.position - 500) < 0.01);
  const reversing = stepSheetSpring(first.position, first.velocity, 88, 0.3);
  assert.ok(reversing.position < first.position);
  assert.ok(Number.isFinite(reversing.velocity));
});
