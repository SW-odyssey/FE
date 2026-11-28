import assert from "node:assert/strict";
import { test } from "node:test";
import { getCourseNames } from "../src/features/discovery/data/course-names.ts";

test("a language switch reads only stop names and keeps a name that fails", async (t) => {
  const calls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    calls.push(url);
    if (url.pathname.endsWith("/42"))
      return new Response(null, { status: 503 });
    return Response.json({
      success: true,
      data: {
        id: 41,
        name: "Onchunjip Ikseon",
        kind: "korean",
        lat: 0,
        lng: 0,
      },
    });
  });
  const names = await getCourseNames(["41", "42", "41"], "en");
  assert.deepEqual(names, { "41": "Onchunjip Ikseon" });
  assert.deepEqual(
    calls.map((url) => `${url.pathname}?${url.searchParams}`),
    ["/api/v2/places/41?lang=en", "/api/v2/places/42?lang=en"],
  );
  assert.equal(
    calls.some((url) => url.pathname.includes("course-recommendations")),
    false,
  );
});

test("an outdated language switch rejects instead of returning old names", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: URL, init?: RequestInit) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    init?.signal?.throwIfAborted();
    return Response.json({ success: true, data: { name: "late" } });
  });
  const controller = new AbortController();
  const pending = getCourseNames(["41"], "ja", controller.signal);
  controller.abort();
  await assert.rejects(pending);
});
