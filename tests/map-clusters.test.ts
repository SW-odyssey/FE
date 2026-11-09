import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clusterScreenPlaces,
  layoutClusterNodes,
  layoutMapCaptions,
  mapFocusCentrePoint,
  type ScreenCluster,
} from "../src/features/map/clusters.ts";

const singleton = (id: string, x: number, y: number): ScreenCluster => ({
  id: `place:${id}`,
  memberIds: [id],
  x,
  y,
  count: 1,
});
const safe = { left: 0, top: 200, right: 393, bottom: 500 };

test("selected places focus inside the uncovered map at every preview scale and sheet height", () => {
  for (const viewportScale of [0.5, 0.9, 1]) {
    for (const sheetInset of [88, 320]) {
      const canvasHeight = 852 * viewportScale;
      const target = { x: 190 * viewportScale, y: 310 * viewportScale };
      const centre = mapFocusCentrePoint(target, {
        canvasHeight,
        viewportScale,
        sheetInset,
      });
      const selectedY =
        (canvasHeight / 2 + target.y - centre.y) / viewportScale;
      const visibleBottom = canvasHeight / viewportScale - sheetInset - 86;
      assert.equal(centre.x, target.x);
      assert.ok(selectedY >= 240 + 22 && selectedY <= visibleBottom - 30);
      if (sheetInset === 320)
        assert.ok(canvasHeight / 2 / viewportScale > visibleBottom - 30);
    }
  }
});

function placed(
  nodes: readonly ScreenCluster[],
  offsets: Map<string, { x: number; y: number }>,
) {
  return nodes.flatMap((node) => {
    const offset = offsets.get(node.id);
    return offset
      ? [{ ...node, x: node.x + offset.x, y: node.y + offset.y }]
      : [];
  });
}

function assertSafeHitBoxes(nodes: readonly { x: number; y: number }[]) {
  for (const node of nodes) {
    assert.ok(node.x - 22 >= safe.left && node.x + 22 <= safe.right);
    assert.ok(node.y - 22 >= safe.top && node.y + 22 <= safe.bottom);
  }
  for (let a = 0; a < nodes.length; a++)
    for (let b = a + 1; b < nodes.length; b++)
      assert.ok(
        Math.abs(nodes[a].x - nodes[b].x) >= 44 ||
          Math.abs(nodes[a].y - nodes[b].y) >= 44,
      );
}

test("screen clusters partition every valid ID once and preserve the count", () => {
  const points = [
    { id: "b", x: 120, y: 300 },
    { id: "a", x: 100, y: 300 },
    { id: "c", x: 290, y: 400 },
  ];
  const clusters = clusterScreenPlaces(points, { radius: 48 });
  assert.deepEqual(clusters, [
    { id: "cluster:a|b", memberIds: ["a", "b"], x: 110, y: 300, count: 2 },
    singleton("c", 290, 400),
  ]);
  assert.equal(
    clusters.reduce((sum, cluster) => sum + cluster.count, 0),
    3,
  );
  assert.equal(
    new Set(clusters.flatMap((cluster) => cluster.memberIds)).size,
    3,
  );
  assert.deepEqual(clusterScreenPlaces([], { radius: 48 }), []);
});

test("distance threshold is inclusive and connected neighbours form one group", () => {
  const points = [
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 48, y: 0 },
    { id: "c", x: 96, y: 0 },
    { id: "far", x: 145, y: 0 },
  ];
  const clusters = clusterScreenPlaces(points, { radius: 48 });
  assert.deepEqual(
    clusters.map((cluster) => cluster.memberIds),
    [["a", "b", "c"], ["far"]],
  );
  assert.equal(clusterScreenPlaces(points, { radius: 47 }).length, 4);
});

test("selected places stay singletons and are subtracted from nearby counts", () => {
  const points = ["c", "a", "b"].map((id) => ({ id, x: 180, y: 300 }));
  const clusters = clusterScreenPlaces(points, { radius: 48, selectedId: "b" });
  assert.deepEqual(clusters, [
    { id: "cluster:a|c", memberIds: ["a", "c"], x: 180, y: 300, count: 2 },
    singleton("b", 180, 300),
  ]);
  assert.equal(
    clusters.reduce((sum, cluster) => sum + cluster.count, 0),
    3,
  );
});

test("clustering is stable after reordering, repeated idle and translation", () => {
  const points = [
    { id: "z", x: 300, y: 400 },
    { id: "b", x: 120, y: 300 },
    { id: "a", x: 100, y: 300 },
  ];
  const expected = clusterScreenPlaces(points, { radius: 48 });
  for (let index = 0; index < 20; index++) {
    assert.deepEqual(
      clusterScreenPlaces([...points].reverse(), { radius: 48 }),
      expected,
    );
  }
  const translated = clusterScreenPlaces(
    points.map((point) => ({ ...point, x: point.x + 30, y: point.y - 50 })),
    { radius: 48 },
  );
  assert.deepEqual(
    translated,
    expected.map((group) => ({
      ...group,
      x: group.x + 30,
      y: group.y - 50,
    })),
  );
});

test("a closer projection separates a group without losing its members", () => {
  const points = [
    { id: "a", x: 100, y: 300 },
    { id: "b", x: 130, y: 300 },
    { id: "c", x: 160, y: 300 },
  ];
  assert.equal(clusterScreenPlaces(points, { radius: 48 }).length, 1);
  const closer = clusterScreenPlaces(
    points.map((point) => ({ ...point, x: point.x * 2, y: point.y * 2 })),
    { radius: 48 },
  );
  assert.equal(closer.length, 3);
  assert.deepEqual(
    closer.flatMap((group) => group.memberIds),
    ["a", "b", "c"],
  );
});

test("non-finite coordinates are excluded and the first valid duplicate wins", () => {
  const clusters = clusterScreenPlaces(
    [
      { id: "a", x: Number.NaN, y: 1 },
      { id: "b", x: 50, y: 50 },
      { id: "a", x: 10, y: 20 },
      { id: "a", x: 500, y: 500 },
      { id: "invalid", x: 1, y: Number.POSITIVE_INFINITY },
    ],
    { radius: 0 },
  );
  assert.deepEqual(clusters, [singleton("a", 10, 20), singleton("b", 50, 50)]);
});

test("encoded cluster IDs cannot confuse a member delimiter with two IDs", () => {
  const combined = clusterScreenPlaces(
    [
      { id: "a|b", x: 0, y: 0 },
      { id: "c", x: 0, y: 0 },
    ],
    { radius: 0 },
  );
  const split = clusterScreenPlaces(
    [
      { id: "a", x: 0, y: 0 },
      { id: "b|c", x: 0, y: 0 },
    ],
    { radius: 0 },
  );
  assert.notEqual(combined[0].id, split[0].id);
});

test("independent anchors stay put and only colliding nodes receive offsets", () => {
  const nodes = [
    singleton("a", 190, 300),
    singleton("b", 191, 301),
    singleton("far", 325, 440),
  ];
  const offsets = layoutClusterNodes(nodes, safe);
  assert.equal(offsets.size, nodes.length);
  assert.deepEqual(offsets.get("place:far"), { x: 0, y: 0 });
  assertSafeHitBoxes(placed(nodes, offsets));
});

test("twenty coincident places unfold with separate hit boxes and a fixed selected anchor", () => {
  const nodes = Array.from({ length: 20 }, (_, index) =>
    singleton(String(index).padStart(2, "0"), 190, 350),
  );
  const offsets = layoutClusterNodes(nodes, { ...safe, pinnedId: "place:12" });
  assert.equal(offsets.size, nodes.length);
  assert.deepEqual(offsets.get("place:12"), { x: 0, y: 0 });
  assertSafeHitBoxes(placed(nodes, offsets));
  assert.deepEqual(
    layoutClusterNodes([...nodes].reverse(), { ...safe, pinnedId: "place:12" }),
    offsets,
  );
});

test("edge collisions move safely inside bounds while a distant anchor stays fixed", () => {
  const nodes = [
    singleton("a", 2, 205),
    singleton("b", 4, 207),
    singleton("far", 325, 440),
  ];
  const offsets = layoutClusterNodes(nodes, safe);
  assert.equal(offsets.size, nodes.length);
  assert.deepEqual(offsets.get("place:far"), { x: 0, y: 0 });
  assertSafeHitBoxes(placed(nodes, offsets));
});

test("mixed twenty-place layouts remain bounded and clickable across repeated idle inputs", () => {
  let seed = 2721;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let run = 0; run < 100; run++) {
    const nodes = Array.from({ length: 20 }, (_, index) =>
      singleton(String(index), 22 + random() * 349, 222 + random() * 256),
    );
    const options = { ...safe, pinnedId: nodes[0].id };
    const offsets = layoutClusterNodes(nodes, options);
    assert.equal(offsets.size, nodes.length);
    assert.deepEqual(offsets.get(nodes[0].id), { x: 0, y: 0 });
    assertSafeHitBoxes(placed(nodes, offsets));
    assert.deepEqual(layoutClusterNodes(nodes, options), offsets);
  }
});

test("a requested gap cannot shrink hit boxes below 44px", () => {
  const nodes = [singleton("a", 190, 300), singleton("b", 190, 300)];
  const offsets = layoutClusterNodes(nodes, { ...safe, gap: 10 });
  assertSafeHitBoxes(placed(nodes, offsets));
  const wider = placed(nodes, layoutClusterNodes(nodes, { ...safe, gap: 60 }));
  assert.ok(
    Math.abs(wider[0].x - wider[1].x) >= 60 ||
      Math.abs(wider[0].y - wider[1].y) >= 60,
  );
});

test("a displacement cap omits distant spread positions while preserving the pinned anchor", () => {
  const nodes = Array.from({ length: 12 }, (_, index) =>
    singleton(String(index).padStart(2, "0"), 190, 350),
  );
  nodes.push(singleton("far", 325, 440));
  const offsets = layoutClusterNodes(nodes, {
    ...safe,
    pinnedId: "place:05",
    maxDisplacement: 48,
  });
  assert.ok(offsets.size > 2 && offsets.size < nodes.length);
  assert.deepEqual(offsets.get("place:05"), { x: 0, y: 0 });
  assert.deepEqual(offsets.get("place:far"), { x: 0, y: 0 });
  for (const offset of offsets.values()) {
    assert.ok(Math.hypot(offset.x, offset.y) <= 48);
  }
  assertSafeHitBoxes(placed(nodes, offsets));
  const fixed = layoutClusterNodes(nodes, {
    ...safe,
    pinnedId: "place:05",
    maxDisplacement: 0,
  });
  assert.equal(fixed.size, 2);
});

test("pinned anchors never move even outside bounds; unsafe nodes are omitted", () => {
  const nodes = [singleton("a", 100, 100), singleton("b", 100, 100)];
  const offsets = layoutClusterNodes(nodes, {
    left: 0,
    top: 0,
    right: 40,
    bottom: 40,
    pinnedId: "place:a",
  });
  assert.deepEqual([...offsets], [["place:a", { x: 0, y: 0 }]]);
  const capacity = layoutClusterNodes(nodes, {
    left: 0,
    top: 0,
    right: 44,
    bottom: 44,
  });
  assert.equal(capacity.size, 1);
  assert.deepEqual(
    placed(nodes, capacity).map(({ x, y }) => ({ x, y })),
    [{ x: 22, y: 22 }],
  );
});

test("helpers never mutate inputs or their member arrays", () => {
  const points = Object.freeze([
    Object.freeze({ id: "b", x: 180, y: 300 }),
    Object.freeze({ id: "a", x: 180, y: 300 }),
  ]);
  const snapshot = JSON.stringify(points);
  const nodes = clusterScreenPlaces(points, { radius: 48, selectedId: "a" });
  const nodeSnapshot = JSON.stringify(nodes);
  nodes.forEach((node) => {
    Object.freeze(node.memberIds);
    Object.freeze(node);
  });
  Object.freeze(nodes);
  layoutClusterNodes(nodes, { ...safe, pinnedId: "place:a" });
  layoutMapCaptions(nodes, { ...safe, selectedId: "place:a" });
  assert.equal(JSON.stringify(points), snapshot);
  assert.equal(JSON.stringify(nodes), nodeSnapshot);
});

test("captions centre above pins by default and fall below when the full height cannot fit", () => {
  assert.deepEqual(
    layoutMapCaptions([{ id: "a", x: 190, y: 350 }], safe).get("a"),
    { side: "top", maxWidth: 132, height: 40 },
  );
  assert.deepEqual(
    layoutMapCaptions([{ id: "a", x: 190, y: 260 }], safe).get("a"),
    { side: "bottom", maxWidth: 132, height: 40 },
  );
  assert.deepEqual(
    layoutMapCaptions([{ id: "a", x: 190, y: 260, height: 24 }], safe).get("a"),
    { side: "top", maxWidth: 132, height: 24 },
  );
});

test("selected captions precede source order and the total label limit defaults to three", () => {
  const nodes = [
    { id: "z", x: 100, y: 100 },
    { id: "a", x: 300, y: 100 },
    { id: "m", x: 500, y: 100 },
    { id: "q", x: 700, y: 100 },
  ];
  const bounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
  const selected = layoutMapCaptions(nodes, { ...bounds, selectedId: "q" });
  assert.deepEqual([...selected.keys()], ["q", "z", "a"]);
  assert.deepEqual(selected.get("q"), {
    side: "top",
    maxWidth: 160,
    height: 40,
  });
  assert.equal(selected.get("z")?.maxWidth, 132);
  assert.deepEqual(
    [...layoutMapCaptions(nodes, bounds).keys()],
    ["z", "a", "m"],
  );
  assert.deepEqual(
    [
      ...layoutMapCaptions(nodes, {
        ...bounds,
        selectedId: "q",
        maxLabels: 1,
      }).keys(),
    ],
    ["q"],
  );
  assert.equal(layoutMapCaptions(nodes, { ...bounds, maxLabels: 0 }).size, 0);
  assert.deepEqual(
    layoutMapCaptions(nodes, { ...bounds, selectedId: "q" }),
    selected,
  );
  assert.deepEqual(
    nodes.map((node) => node.id),
    ["z", "a", "m", "q"],
  );
});

test("captions respect minimum centred width, the 40px height cap and pin obstacles", () => {
  assert.equal(layoutMapCaptions([{ id: "a", x: 30, y: 350 }], safe).size, 0);
  assert.deepEqual(
    layoutMapCaptions(
      [{ id: "a", x: 45, y: 350, width: 200, height: 80 }],
      safe,
    ).get("a"),
    { side: "top", maxWidth: 90, height: 40 },
  );
  const node = { id: "a", x: 190, y: 350 };
  const topPin = { id: "top", x: 190, y: 300 };
  const bottomPin = { id: "bottom", x: 190, y: 400 };
  assert.deepEqual(
    layoutMapCaptions([node], { ...safe, obstacles: [topPin] }).get("a"),
    { side: "bottom", maxWidth: 132, height: 40 },
  );
  assert.equal(
    layoutMapCaptions([node], {
      ...safe,
      obstacles: [topPin, bottomPin],
    }).size,
    0,
  );
});

test("selected names remain safely visible over pin obstacles and reserve their caption space", () => {
  const selected = { id: "selected", x: 190, y: 350 };
  const placements = layoutMapCaptions(
    [{ id: "neighbor", x: 290, y: 350 }, selected],
    {
      ...safe,
      selectedId: selected.id,
      obstacles: [
        { id: "top", x: 190, y: 300 },
        { id: "bottom", x: 190, y: 400 },
      ],
    },
  );
  assert.deepEqual(placements.get(selected.id), {
    side: "top",
    maxWidth: 160,
    height: 40,
  });
  assert.equal(placements.get("neighbor")?.side, "bottom");
  const low = { ...selected, y: 250 };
  const below = layoutMapCaptions([low], {
    ...safe,
    selectedId: low.id,
    obstacles: [
      { id: "top", x: 190, y: 200 },
      { id: "bottom", x: 190, y: 300 },
    ],
  }).get(low.id);
  assert.deepEqual(below, { side: "bottom", maxWidth: 160, height: 40 });
  for (const [node, caption] of [
    [selected, placements.get(selected.id)!],
    [low, below!],
  ] as const) {
    const top =
      caption.side === "top" ? node.y - 28 - caption.height : node.y + 28;
    assert.ok(top >= safe.top && top + caption.height <= safe.bottom);
    assert.ok(node.x - caption.maxWidth / 2 >= safe.left);
    assert.ok(node.x + caption.maxWidth / 2 <= safe.right);
  }
});

test("visible top and bottom captions stay bounded and clear all pins and other captions", () => {
  const nodes = [
    { id: "a", x: 80, y: 290 },
    { id: "b", x: 310, y: 290 },
    { id: "c", x: 190, y: 400 },
    { id: "d", x: 350, y: 440 },
  ];
  const obstacles = [...nodes, { id: "extra", x: 190, y: 350 }];
  const captions = layoutMapCaptions(nodes, {
    ...safe,
    selectedId: "b",
    obstacles,
  });
  assert.equal(captions.size, 3);
  assert.equal(captions.get("c")?.side, "bottom");
  const boxes = nodes.flatMap((node) => {
    const caption = captions.get(node.id);
    if (!caption) return [];
    const left = node.x - caption.maxWidth / 2;
    const top =
      caption.side === "top" ? node.y - 28 - caption.height : node.y + 28;
    return [
      {
        id: node.id,
        left,
        right: left + caption.maxWidth,
        top,
        bottom: top + caption.height,
      },
    ];
  });
  const overlaps = (
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number },
  ) =>
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top;
  for (const box of boxes) {
    assert.ok(box.left >= safe.left && box.right <= safe.right);
    assert.ok(box.top >= safe.top && box.bottom <= safe.bottom);
    for (const pin of obstacles) {
      if (pin.id === box.id) continue;
      assert.equal(
        overlaps(box, {
          left: pin.x - 22,
          right: pin.x + 22,
          top: pin.y - 22,
          bottom: pin.y + 22,
        }),
        false,
      );
    }
    for (const other of boxes) {
      if (other.id !== box.id) assert.equal(overlaps(box, other), false);
    }
  }
});
