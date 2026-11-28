import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { handlePlacePhotos } from "../server/place-photos.ts";
import { resetPlaceQuota } from "../server/place-quota.ts";
import {
  defaultAllowedHosts,
  isLocalPlaceRequest,
  placeServerConfig,
  PlaceConfigError,
} from "../server/place-request.ts";
import { handlePlaceSummary } from "../server/place-summary.ts";
import { odysseyApiOrigin } from "../src/features/discovery/data/odyssey-api-origin.ts";
import { resetPlaceLookups } from "../server/place-request.ts";

beforeEach(resetPlaceLookups);

beforeEach(resetPlaceQuota);
const staging = "https://odyssey-be-staging.example.run.app";

test("with nothing set the server uses production and the default hosts", () => {
  assert.deepEqual(placeServerConfig(), {
    apiOrigin: odysseyApiOrigin,
    allowedHosts: defaultAllowedHosts,
  });
});

test("the server value wins, then the browser build value", () => {
  assert.equal(
    placeServerConfig({
      ODYSSEY_API_BASE_URL: `${staging}/`,
      NEXT_PUBLIC_ODYSSEY_API_BASE_URL: "https://other.example",
    }).apiOrigin,
    staging,
  );
  assert.equal(
    placeServerConfig({ NEXT_PUBLIC_ODYSSEY_API_BASE_URL: staging }).apiOrigin,
    staging,
  );
  assert.equal(
    placeServerConfig({ ODYSSEY_API_BASE_URL: "http://localhost:8080" })
      .apiOrigin,
    "http://localhost:8080",
  );
});

test("invalid settings fail instead of falling back to production", () => {
  for (const value of ["http://staging.example", "not a url", "ftp://x"])
    assert.throws(
      () => placeServerConfig({ ODYSSEY_API_BASE_URL: value }),
      PlaceConfigError,
    );
  assert.throws(
    () => placeServerConfig({ PLACE_ALLOWED_HOSTS: "good.example, bad/host" }),
    PlaceConfigError,
  );
});

test("allowed hosts accept exact names and *.pages.dev previews only", () => {
  const { allowedHosts } = placeServerConfig({
    PLACE_ALLOWED_HOSTS: "staging.local.hrxlou.com, *.local-odyssey.pages.dev",
  });
  const allowed = (host: string) =>
    isLocalPlaceRequest(
      new Request(`https://${host}/`),
      new URL(`https://${host}/api`),
      allowedHosts,
    );
  assert.equal(allowed("staging.local.hrxlou.com"), true);
  assert.equal(allowed("abc123.local-odyssey.pages.dev"), true);
  assert.equal(allowed("local-odyssey.pages.dev.evil.example"), false);
  assert.equal(allowed("evil-local-odyssey.pages.dev"), false);
  assert.equal(
    allowed("local.hrxlou.com"),
    false,
    "the list replaces defaults",
  );
});

test("photos and summaries read the place from the same configured API", async (t) => {
  const looked: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL) => {
    const href = String(url);
    if (href.includes("/api/v2/places/")) {
      looked.push(new URL(href).origin);
      return Response.json({
        success: true,
        data: { name: "x", lat: 37.5, lng: 126.9, googlePlaceId: null },
      });
    }
    return new Response(null, { status: 500 });
  });
  const env = { ODYSSEY_API_BASE_URL: staging };
  await handlePlacePhotos(
    new Request("http://localhost/api/place-photos?id=7&variant=thumbnail"),
    "key",
    undefined,
    env,
  );
  await handlePlaceSummary(
    new Request("http://localhost/api/place-summary?id=7&lang=ko", {
      method: "POST",
    }),
    "key",
    undefined,
    env,
  );
  // One shared lookup serves both helpers (#86).
  assert.deepEqual(looked, [staging]);
});

test("a misconfigured server answers 500 without calling any API", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({}),
  );
  const response = await handlePlacePhotos(
    new Request("http://localhost/api/place-photos?id=7&variant=thumbnail"),
    "key",
    undefined,
    { ODYSSEY_API_BASE_URL: "http://staging.example" },
  );
  assert.equal(response.status, 500);
  assert.equal(fetch.mock.callCount(), 0);
});
