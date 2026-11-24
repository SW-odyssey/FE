import assert from "node:assert/strict";
import { test } from "node:test";
import { handlePlacePhotos } from "../server/place-photos.ts";

const key = "server-only-test-key";
const endpoint = "/api/place-photos?id=1557&variant=thumbnail";

test("returns a temporary photo URL and attribution for a verified Odyssey place", async (t) => {
  const name = "places/ChIJtest/photos/photoTest";
  const sourceUrl = "https://www.google.com/maps/contrib/123/photos";
  const image = "https://lh3.googleusercontent.com/temporary-photo";
  const upstream = t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL, init: RequestInit) => {
      const href = String(url);
      const headers = new Headers(init.headers);
      if (href.endsWith("/api/v2/places/1557")) {
        assert.ok(!headers.has("X-Goog-Api-Key"));
        return Response.json({
          success: true,
          data: { googlePlaceId: "ChIJtest" },
        });
      }
      assert.equal(headers.get("X-Goog-Api-Key"), key);
      assert.equal(init.redirect, "manual");
      assert.equal(new URL(url).hostname, "places.googleapis.com");
      assert.ok(!href.includes(key));
      if (!href.includes("/media?")) {
        assert.equal(headers.get("X-Goog-FieldMask"), "photos");
        return Response.json({
          photos: [
            {
              name,
              googleMapsUri: sourceUrl,
              authorAttributions: [
                {
                  displayName: "Photo author",
                  uri: "//maps.google.com/maps/contrib/123",
                },
              ],
            },
          ],
        });
      }
      assert.ok(
        href.endsWith(`${name}/media?maxWidthPx=640&skipHttpRedirect=true`),
      );
      return Response.json({ photoUri: image });
    },
  );

  const result = await handlePlacePhotos(
    new Request(`http://localhost${endpoint}`),
    key,
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  const body = await result.text();
  assert.ok(!body.includes(key));
  assert.deepEqual(JSON.parse(body), {
    photoList: [
      {
        src: image,
        imageUrl: image,
        credit: "Google Maps",
        sourceUrl,
        authors: [
          {
            name: "Photo author",
            uri: "https://maps.google.com/maps/contrib/123",
          },
        ],
      },
    ],
  });
  assert.equal(upstream.mock.callCount(), 3);
});

test("rejects unsupported and cross-site requests before contacting Places", async (t) => {
  const upstream = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(),
  );
  const publicRequest = new Request(`https://example.com${endpoint}`);
  const crossSiteRequest = new Request(`http://localhost${endpoint}`, {
    headers: { "Sec-Fetch-Site": "cross-site" },
  });
  const invalid = new Request(
    "http://localhost/api/place-photos?id=../photos&variant=gallery",
  );
  assert.equal((await handlePlacePhotos(publicRequest, key)).status, 404);
  assert.equal((await handlePlacePhotos(crossSiteRequest, key)).status, 404);
  assert.equal((await handlePlacePhotos(invalid, key)).status, 400);
  assert.equal(upstream.mock.callCount(), 0);
});
