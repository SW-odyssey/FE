import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { handlePlacePhotos } from "../server/place-photos.ts";
import { resetPlaceQuota } from "../server/place-quota.ts";
import {
  lookupPlaceRow,
  placeLookupTtlMs,
  resetPlaceLookups,
} from "../server/place-request.ts";
import { handlePlaceSummary } from "../server/place-summary.ts";

beforeEach(() => {
  resetPlaceLookups();
  resetPlaceQuota();
});
const prod = "https://odyssey.example";
const staging = "https://staging.example";
const row = { name: "x", lat: 37.5, lng: 126.9, googlePlaceId: null };

function count(
  t: { mock: { method: typeof import("node:test").mock.method } },
  fail = () => false,
) {
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL) => {
    const href = String(url);
    if (!href.includes("/api/v2/places/"))
      return new Response(null, { status: 500 });
    urls.push(href);
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (fail()) return new Response(null, { status: 503 });
    return Response.json({ success: true, data: row });
  });
  return urls;
}

test("concurrent photo and summary requests for one store share one lookup", async (t) => {
  const urls = count(t);
  await Promise.all([
    handlePlacePhotos(
      new Request(
        "http://localhost/api/place-photos?id=7&variant=gallery&lang=ja",
      ),
      "key",
    ),
    handlePlacePhotos(
      new Request("http://localhost/api/place-photos?id=7&variant=thumbnail"),
      "key",
    ),
    handlePlaceSummary(
      new Request("http://localhost/api/place-summary?id=7&lang=en", {
        method: "POST",
      }),
      "key",
    ),
  ]);
  assert.equal(urls.length, 1);
});

test("other stores and other environments are looked up separately", async (t) => {
  const urls = count(t);
  const { signal } = new AbortController();
  await Promise.all([
    lookupPlaceRow("7", signal, prod),
    lookupPlaceRow("8", signal, prod),
    lookupPlaceRow("7", signal, staging),
    lookupPlaceRow("7", signal, prod),
  ]);
  assert.deepEqual(urls.sort(), [
    `${prod}/api/v2/places/7`,
    `${prod}/api/v2/places/8`,
    `${staging}/api/v2/places/7`,
  ]);
});

test("a lookup expires after the TTL and a failure is retried", async (t) => {
  let failing = true;
  const urls = count(t, () => failing);
  const { signal } = new AbortController();
  await assert.rejects(lookupPlaceRow("7", signal, prod, 0));
  failing = false;
  assert.deepEqual(await lookupPlaceRow("7", signal, prod, 1), row);
  await lookupPlaceRow("7", signal, prod, 2);
  assert.equal(urls.length, 2);
  await lookupPlaceRow("7", signal, prod, 1 + placeLookupTtlMs);
  assert.equal(urls.length, 3);
});

test("one caller cancelling does not cancel the shared lookup", async (t) => {
  const urls = count(t);
  const cancelled = new AbortController();
  const first = lookupPlaceRow("7", cancelled.signal, prod);
  const second = lookupPlaceRow("7", new AbortController().signal, prod);
  cancelled.abort();
  await assert.rejects(first);
  assert.deepEqual(await second, row);
  assert.equal(urls.length, 1);
});

test("the Cloudflare cache serves another instance without a new lookup", async (t) => {
  const stored = new Map<string, Response>();
  const caches = {
    default: {
      async match(request: Request) {
        return stored.get(request.url)?.clone();
      },
      async put(request: Request, response: Response) {
        stored.set(request.url, response);
      },
    },
  };
  Object.defineProperty(globalThis, "caches", {
    value: caches,
    configurable: true,
  });
  t.after(() => {
    delete (globalThis as { caches?: unknown }).caches;
  });
  const urls = count(t);
  const { signal } = new AbortController();
  await lookupPlaceRow("7", signal, prod);
  resetPlaceLookups(); // a different instance has an empty memory map
  assert.deepEqual(await lookupPlaceRow("7", signal, prod), row);
  assert.equal(urls.length, 1);
  assert.match(
    stored.get(`${prod}/api/v2/places/7`)!.headers.get("Cache-Control")!,
    /max-age=60/,
  );
});
