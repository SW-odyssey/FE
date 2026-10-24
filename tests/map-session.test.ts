import assert from "node:assert/strict";
import { test } from "node:test";
import type { LocalPlace } from "../src/features/discovery/model.ts";
import {
  attachMapSession,
  type ExploreMapOptions,
  type MapCamera,
} from "../src/features/map/controller.ts";
import { createExploreMapSession } from "../src/features/map/kakao/session.ts";

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

test("leaving while the SDK loads never creates a late map or reports its late failure", async () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  let created = 0,
    ready = 0,
    failed = 0;
  const dispose = attachMapSession(
    () =>
      new Promise<void>((yes) => {
        resolve = yes;
      }),
    () => {
      created++;
      return { dispose() {} };
    },
    () => {
      ready++;
    },
    () => {
      failed++;
    },
  );
  dispose();
  resolve();
  await flush();
  const second = attachMapSession(
    () =>
      new Promise<void>((_, no) => {
        reject = no;
      }),
    () => {
      created++;
      return { dispose() {} };
    },
    () => {
      ready++;
    },
    () => {
      failed++;
    },
  );
  second();
  reject(new Error("late SDK error"));
  await flush();
  assert.deepEqual(
    { created, ready, failed },
    { created: 0, ready: 0, failed: 0 },
  );
});

test("an active load failure permits a fresh owner and disposes its session exactly once", async () => {
  let failures = 0,
    cleaned = 0,
    attached = 0;
  const first = attachMapSession(
    () => Promise.reject(new Error("offline")),
    () => ({ dispose() {} }),
    () => {},
    () => {
      failures++;
    },
  );
  await flush();
  first();
  const second = attachMapSession(
    () => Promise.resolve(),
    () => ({
      dispose() {
        cleaned++;
      },
    }),
    () => {
      attached++;
    },
    () => {
      failures++;
    },
  );
  await flush();
  second();
  second();
  assert.deepEqual(
    { failures, cleaned, attached },
    { failures: 1, cleaned: 1, attached: 1 },
  );
});

function fixture(id: string, lat: number, lng: number): LocalPlace {
  return {
    id,
    lat,
    lng,
    name: id,
    koreanName: id,
    area: "ikseon",
    category: "cafe",
    image: "",
    descriptionEn: "",
    descriptionKo: "",
    address: "",
    sourceUrl: "",
  };
}

function fakeSdk() {
  const previous = [
    "kakao",
    "window",
    "ResizeObserver",
    "cancelAnimationFrame",
  ].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  const listeners = new Set<() => void>();
  const maps: FakeMap[] = [];
  let disconnected = 0;
  class LatLng {
    lat: number;
    lng: number;
    constructor(lat: number, lng: number) {
      this.lat = lat;
      this.lng = lng;
    }
    getLat() {
      return this.lat;
    }
    getLng() {
      return this.lng;
    }
  }
  class FakeMap {
    center: LatLng;
    level: number;
    fits: { points: LatLng[]; padding: number[] }[] = [];
    moves: LatLng[] = [];
    constructor(_: unknown, options: { center: LatLng; level: number }) {
      this.center = options.center;
      this.level = options.level;
      maps.push(this);
    }
    setDraggable() {}
    setZoomable() {}
    setMinLevel() {}
    setMaxLevel() {}
    relayout() {}
    getCenter() {
      return this.center;
    }
    getLevel() {
      return this.level;
    }
    setBounds(bounds: { points: LatLng[] }, ...padding: number[]) {
      this.fits.push({ points: bounds.points, padding });
    }
    getProjection() {
      return {
        containerPointFromCoords: (p: LatLng) => ({ x: p.lng, y: p.lat }),
        coordsFromContainerPoint: (p: { x: number; y: number }) =>
          new LatLng(p.y, p.x),
      };
    }
    panTo(point: LatLng) {
      this.center = point;
      this.moves.push(point);
    }
    setCenter(point: LatLng) {
      this.panTo(point);
    }
    setLevel(level: number) {
      this.level = level;
    }
  }
  const replacements = {
    kakao: {
      maps: {
        Map: FakeMap,
        LatLng,
        Point: class {
          x: number;
          y: number;
          constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
          }
        },
        LatLngBounds: class {
          points: LatLng[] = [];
          extend(p: LatLng) {
            this.points.push(p);
          }
        },
        event: {
          addListener(_: unknown, __: string, fn: () => void) {
            listeners.add(fn);
          },
          removeListener(_: unknown, __: string, fn: () => void) {
            listeners.delete(fn);
          },
        },
      },
    },
    window: { matchMedia: () => ({ matches: false }) },
    ResizeObserver: class {
      observe() {}
      disconnect() {
        disconnected++;
      }
    },
    cancelAnimationFrame() {},
  };
  for (const [key, value] of Object.entries(replacements))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  return {
    maps,
    listeners,
    disconnected: () => disconnected,
    restore() {
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test("returning restores camera and selection once; explicit fit still uses current sheet padding", () => {
  const sdk = fakeSdk();
  try {
    const a = fixture("a", 37.57, 126.98),
      b = fixture("b", 37.58, 126.99);
    const memory: { current: MapCamera | null } = {
      current: {
        lat: 37.56,
        lng: 126.97,
        level: 2,
        collection: "a,b",
        selectedId: "a",
      },
    };
    let options: ExploreMapOptions = {
      places: [a, b],
      selected: a,
      language: "en",
      origin: null,
      onSelect() {},
      focusSelected: true,
      viewportScale: 0.75,
      sheetInset: 500,
      memory,
    };
    const session = createExploreMapSession(
      { clientHeight: 639 } as HTMLDivElement,
      () => options,
      () => {},
    );
    const map = sdk.maps[0];
    assert.equal(map.level, 2);
    assert.equal(map.center.lat, 37.56);
    session.fitRecommendations(true);
    session.focusSelected();
    assert.equal(map.fits.length, 0);
    assert.equal(map.moves.length, 0);
    session.fitRecommendations();
    assert.deepEqual(map.fits[0].padding, [189, 69, 340.5, 39]);
    assert.deepEqual(
      map.fits[0].points.map((p) => [p.lat, p.lng]),
      [
        [a.lat, a.lng],
        [b.lat, b.lng],
      ],
    );
    options = { ...options, selected: b, sheetInset: 320 };
    session.focusSelected();
    assert.equal(map.moves.length, 1);
    assert.equal(map.center.lng, b.lng);
    assert.notEqual(map.center.lat, b.lat); // Focus uses the uncovered map, not the full canvas.
    session.centerOn({ lat: 37.59, lng: 127 });
    options = { ...options, places: [b, a] };
    session.dispose();
    session.dispose();
    assert.deepEqual(memory.current, {
      lat: 37.59,
      lng: 127,
      level: 2,
      collection: "b,a",
      selectedId: "b",
    });
    assert.equal(sdk.listeners.size, 0);
    assert.equal(sdk.disconnected(), 1);
  } finally {
    sdk.restore();
  }
});

test("a changed recommendation collection ignores the old camera and performs its initial fit", () => {
  const sdk = fakeSdk();
  try {
    const a = fixture("a", 37.57, 126.98);
    const options: ExploreMapOptions = {
      places: [a],
      selected: null,
      language: "en",
      origin: null,
      onSelect() {},
      viewportScale: 1,
      sheetInset: 320,
      memory: {
        current: {
          lat: 1,
          lng: 2,
          level: 1,
          collection: "previous",
          selectedId: null,
        },
      },
    };
    const session = createExploreMapSession(
      { clientHeight: 852 } as HTMLDivElement,
      () => options,
      () => {},
    );
    assert.equal(sdk.maps[0].level, 5);
    session.fitRecommendations(true);
    assert.equal(sdk.maps[0].fits.length, 1);
    session.dispose();
  } finally {
    sdk.restore();
  }
});
