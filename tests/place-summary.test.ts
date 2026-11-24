import assert from "node:assert/strict";
import { test } from "node:test";
import { handlePlaceSummary } from "../server/place-summary.ts";

const key = "server-only-test-key";
const endpoint = "http://localhost/api/place-summary?id=1006&lang=ko";

test("summary generation receives only verified store fields and protects the server key", async (t) => {
  const provider = t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL, init: RequestInit) => {
      if (new URL(url).pathname.endsWith("/api/v2/places/1006")) {
        assert.equal(new Headers(init.headers).has("X-Goog-Api-Key"), false);
        return Response.json({
          success: true,
          data: {
            name: "소살리토",
            sinceDate: "1994-09-07",
            googlePlaceId: "ChIJtest",
          },
        });
      }
      assert.equal(new URL(url).hostname, "generativelanguage.googleapis.com");
      assert.equal(new Headers(init.headers).get("X-Goog-Api-Key"), key);
      assert.equal(init.redirect, "manual");
      const body = String(init.body);
      assert.ok(body.includes("Korean"));
      assert.ok(body.includes("1994"));
      assert.ok(!body.includes("ChIJtest"));
      assert.ok(!body.includes("CUSTOM_TEXT"));
      return Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: {
              parts: [
                { thought: true, text: "hidden" },
                {
                  text: "소살리토의 인허가 기록은 1994년으로 거슬러 올라가요.",
                },
              ],
            },
          },
        ],
      });
    },
  );
  const result = await handlePlaceSummary(
    new Request(`${endpoint}&prompt=CUSTOM_TEXT`),
    key,
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "private, max-age=86400");
  assert.deepEqual(await result.json(), {
    summary: "소살리토의 인허가 기록은 1994년으로 거슬러 올라가요.",
  });
  assert.equal(provider.mock.callCount(), 2);
});

test("missing permit data does not cause a model call", async (t) => {
  const provider = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: true, data: { name: "카페", sinceDate: null } }),
  );
  assert.equal(
    (await handlePlaceSummary(new Request(endpoint), key)).status,
    204,
  );
  assert.equal(provider.mock.callCount(), 1);
});
