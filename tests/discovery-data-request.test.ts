import assert from "node:assert/strict";
import { test } from "node:test";
import { createLatestRequest } from "../src/features/discovery/data/latest-request.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test("newer queries abort the previous signal and discard a late result", async () => {
  const lane = createLatestRequest<string>();
  const first = deferred<string>();
  const second = deferred<string>();
  const values: string[] = [];
  const errors: unknown[] = [];
  const signals: AbortSignal[] = [];
  const handlers = {
    resolve: (v: string) => values.push(v),
    reject: (e: unknown) => errors.push(e),
  };
  lane.run((signal) => {
    signals.push(signal);
    return first.promise;
  }, handlers);
  await settle();
  lane.run((signal) => {
    signals.push(signal);
    return second.promise;
  }, handlers);
  await settle();
  assert.equal(signals[0].aborted, true);
  assert.equal(signals[1].aborted, false);
  second.resolve("latest");
  await settle();
  first.resolve("stale source ignored abort");
  await settle();
  assert.deepEqual(values, ["latest"]);
  assert.deepEqual(errors, []);
});

test("cleanup suppresses results and errors after the screen has left", async () => {
  const lane = createLatestRequest<string>();
  const pending = deferred<string>();
  const events: unknown[] = [];
  let signal!: AbortSignal;
  const cleanup = lane.run(
    (next) => {
      signal = next;
      return pending.promise;
    },
    { resolve: (v) => events.push(v), reject: (e) => events.push(e) },
  );
  await settle();
  cleanup();
  assert.equal(signal.aborted, true);
  pending.reject(new Error("late failure"));
  await settle();
  assert.deepEqual(events, []);
});

test("old cleanup cannot cancel a replacement and current errors remain visible", async () => {
  const lane = createLatestRequest<string>();
  const failure = new Error("source unavailable");
  const errors: unknown[] = [];
  const oldCleanup = lane.run(async () => "old", {
    resolve: () => {},
    reject: () => {},
  });
  lane.run(
    async (signal) => {
      assert.equal(signal.aborted, false);
      throw failure;
    },
    {
      resolve: () => assert.fail("unexpected result"),
      reject: (e) => errors.push(e),
    },
  );
  oldCleanup();
  await settle();
  assert.deepEqual(errors, [failure]);
});

test("applied, draft and detail lanes cancel independently", async () => {
  const applied = createLatestRequest<string>();
  const draft = createLatestRequest<string>();
  const detail = createLatestRequest<string>();
  const pending = [deferred<string>(), deferred<string>(), deferred<string>()];
  const values: string[] = [];
  [applied, draft, detail].forEach((lane, i) =>
    lane.run(() => pending[i].promise, {
      resolve: (value) => values.push(value),
      reject: () => assert.fail("unexpected failure"),
    }),
  );
  await settle();
  draft.cancel();
  pending[0].resolve("applied");
  pending[1].resolve("draft");
  pending[2].resolve("detail");
  await settle();
  assert.deepEqual(values, ["applied", "detail"]);
});

test("retrying all active lanes aborts their pending requests and ignores old results", async () => {
  const lanes = [
    createLatestRequest<string>(),
    createLatestRequest<string>(),
    createLatestRequest<string>(),
  ];
  const pending = lanes.map(() => deferred<string>());
  const signals: AbortSignal[] = [];
  const values: string[] = [];
  const handlers = {
    resolve: (value: string) => values.push(value),
    reject: () => assert.fail("unexpected failure"),
  };
  lanes.forEach((lane, i) =>
    lane.run((signal) => {
      signals.push(signal);
      return pending[i].promise;
    }, handlers),
  );
  await settle();
  lanes.forEach((lane, i) => lane.run(async () => `retry-${i}`, handlers));
  await settle();
  assert.ok(signals.every((signal) => signal.aborted));
  pending.forEach((request) => request.resolve("stale-before-retry"));
  await settle();
  assert.deepEqual(values, ["retry-0", "retry-1", "retry-2"]);
});

test("a lane can retry successfully after its current request failed", async () => {
  const lane = createLatestRequest<string>();
  const failure = new Error("temporary failure");
  const errors: unknown[] = [];
  const values: string[] = [];
  const handlers = {
    resolve: (value: string) => values.push(value),
    reject: (error: unknown) => errors.push(error),
  };
  lane.run(async () => {
    throw failure;
  }, handlers);
  await settle();
  assert.deepEqual(errors, [failure]);
  lane.run(async () => "recovered", handlers);
  await settle();
  assert.deepEqual(values, ["recovered"]);
});
