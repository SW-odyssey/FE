export type ProjectedPlace = { id: string; x: number; y: number };

export type ScreenCluster = {
  id: string;
  memberIds: string[];
  x: number;
  y: number;
  count: number;
};

export type CaptionNode = {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

const compareIds = (a: { id: string }, b: { id: string }) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/**
 * Centre a selected place in the uncovered map instead of the full canvas.
 * @param target Selected place's SDK physical container point
 * @param options Physical canvas height, positive scale, and logical safe insets
 * @returns SDK physical container point to convert into the new map centre
 */
export function mapFocusCentrePoint(
  target: { x: number; y: number },
  options: {
    canvasHeight: number;
    viewportScale: number;
    sheetInset: number;
    top?: number;
  },
): { x: number; y: number } {
  const visibleBottom =
    options.canvasHeight / options.viewportScale - options.sheetInset - 86;
  const visibleCentreY = ((options.top ?? 240) + visibleBottom - 8) / 2;
  return {
    x: target.x,
    y:
      target.y +
      options.canvasHeight / 2 -
      visibleCentreY * options.viewportScale,
  };
}

/**
 * Partition logical screen coordinates; keep the first valid point per ID.
 * @param points Projected anchors in logical screen pixels
 * @param options Distance threshold and the place that must remain separate
 * @returns A stable partition containing every valid unique place exactly once
 */
export function clusterScreenPlaces(
  points: readonly ProjectedPlace[],
  options: { radius: number; selectedId?: string | null },
): ScreenCluster[] {
  const unique = new Map<string, ProjectedPlace>();
  for (const point of points) {
    if (
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      !unique.has(point.id)
    ) {
      unique.set(point.id, point);
    }
  }
  const sorted = [...unique.values()].sort(compareIds);
  const parents = sorted.map((_, index) => index);
  const root = (index: number): number => {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]];
      index = parents[index];
    }
    return index;
  };
  const radius = Number.isFinite(options.radius)
    ? Math.max(0, options.radius)
    : 0;
  for (let a = 0; a < sorted.length; a++) {
    if (sorted[a].id === options.selectedId) continue;
    for (let b = a + 1; b < sorted.length; b++) {
      if (sorted[b].id === options.selectedId) continue;
      if (
        Math.hypot(sorted[a].x - sorted[b].x, sorted[a].y - sorted[b].y) <=
        radius
      ) {
        const left = root(a);
        const right = root(b);
        parents[Math.max(left, right)] = Math.min(left, right);
      }
    }
  }
  const groups = new Map<number, ProjectedPlace[]>();
  sorted.forEach((point, index) => {
    const key = root(index);
    const members = groups.get(key) ?? [];
    members.push(point);
    groups.set(key, members);
  });
  return [...groups.values()].map((members) => {
    const memberIds = members.map((point) => point.id);
    return {
      id:
        members.length === 1
          ? `place:${members[0].id}`
          : `cluster:${memberIds.map(encodeURIComponent).join("|")}`,
      memberIds,
      x: members.reduce((sum, point) => sum + point.x / members.length, 0),
      y: members.reduce((sum, point) => sum + point.y / members.length, 0),
      count: members.length,
    };
  });
}

/**
 * Move only colliding/out-of-bounds 44px hit boxes; never move the pinned node.
 * Bounds describe the outside of the safe rectangle, and gap is centre spacing.
 * An omitted ID has no safe position; callers must hide it rather than overlap.
 * @param nodes Cluster or individual place anchors in logical screen pixels
 * @param options Safe bounds, fixed anchor, and optional movement distance cap
 * @returns Offsets for safe nodes; pinned and independent anchors retain zero
 */
export function layoutClusterNodes(
  nodes: readonly ScreenCluster[],
  options: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    gap?: number;
    pinnedId?: string | null;
    maxDisplacement?: number;
  },
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  const unique = new Map<string, ScreenCluster>();
  for (const node of nodes) {
    if (
      Number.isFinite(node.x) &&
      Number.isFinite(node.y) &&
      !unique.has(node.id)
    ) {
      unique.set(node.id, node);
    }
  }
  const sorted = [...unique.values()].sort(compareIds);
  const pinned = sorted.find((node) => node.id === options.pinnedId);
  if (pinned) result.set(pinned.id, { x: 0, y: 0 });
  if (
    ![options.left, options.top, options.right, options.bottom].every(
      Number.isFinite,
    )
  ) {
    return result;
  }
  const gap = Math.max(
    44,
    Number.isFinite(options.gap) ? (options.gap ?? 44) : 44,
  );
  const maxDisplacement = Number.isFinite(options.maxDisplacement)
    ? Math.max(0, options.maxDisplacement ?? 0)
    : Number.POSITIVE_INFINITY;
  const left = options.left + 22;
  const right = options.right - 22;
  const top = options.top + 22;
  const bottom = options.bottom - 22;
  if (left > right || top > bottom) return result;
  const fits = (point: { x: number; y: number }) =>
    point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
  const overlaps = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < gap && Math.abs(a.y - b.y) < gap;
  const occupied: { x: number; y: number }[] = pinned ? [pinned] : [];
  const movable = sorted.filter((node) => node !== pinned);
  // Reserve genuinely independent anchors before placing any collision group.
  const independent = new Set(
    movable
      .filter(
        (node) =>
          fits(node) &&
          !sorted.some((other) => other !== node && overlaps(node, other)),
      )
      .map((node) => node.id),
  );
  for (const node of movable) {
    if (!independent.has(node.id)) continue;
    result.set(node.id, { x: 0, y: 0 });
    occupied.push(node);
  }
  for (const node of movable) {
    if (independent.has(node.id)) continue;
    if (fits(node) && !occupied.some((other) => overlaps(node, other))) {
      result.set(node.id, { x: 0, y: 0 });
      occupied.push(node);
      continue;
    }
    const xs = new Set([left, right, Math.max(left, Math.min(right, node.x))]);
    const ys = new Set([top, bottom, Math.max(top, Math.min(bottom, node.y))]);
    for (let x = left; x <= right; x += gap) xs.add(x);
    for (let y = top; y <= bottom; y += gap) ys.add(y);
    for (const other of occupied) {
      xs.add(other.x - gap);
      xs.add(other.x + gap);
      ys.add(other.y - gap);
      ys.add(other.y + gap);
    }
    let best: { x: number; y: number; distance: number } | null = null;
    for (const x of xs) {
      for (const y of ys) {
        const point = { x, y };
        if (!fits(point) || occupied.some((other) => overlaps(point, other)))
          continue;
        const distance = Math.hypot(x - node.x, y - node.y);
        if (distance > maxDisplacement) continue;
        if (
          !best ||
          distance < best.distance ||
          (distance === best.distance &&
            (y < best.y || (y === best.y && x < best.x)))
        ) {
          best = { x, y, distance };
        }
      }
    }
    if (best) {
      result.set(node.id, { x: best.x - node.x, y: best.y - node.y });
      occupied.push({ x: best.x, y: best.y });
    }
  }
  return result;
}

/**
 * Place centred captions above pins, trying below only when above is blocked.
 * @param nodes Caption anchors in source priority order, with measured sizes
 * @param options Safe bounds, selected priority, all pin obstacles and label cap
 * @returns Safe captions; selected names may cover pins and later labels avoid them
 */
export function layoutMapCaptions(
  nodes: readonly CaptionNode[],
  options: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    selectedId?: string | null;
    obstacles?: readonly ProjectedPlace[];
    maxLabels?: number;
  },
): Map<string, { side: "top" | "bottom"; maxWidth: number; height: number }> {
  const result = new Map<
    string,
    { side: "top" | "bottom"; maxWidth: number; height: number }
  >();
  if (
    ![options.left, options.top, options.right, options.bottom].every(
      Number.isFinite,
    )
  ) {
    return result;
  }
  const unique = new Map<string, CaptionNode>();
  for (const node of nodes) {
    if (
      Number.isFinite(node.x) &&
      Number.isFinite(node.y) &&
      !unique.has(node.id)
    ) {
      unique.set(node.id, node);
    }
  }
  const source = [...unique.values()];
  const selected = source.find((node) => node.id === options.selectedId);
  const ordered = selected
    ? [selected, ...source.filter((node) => node !== selected)]
    : source;
  const maxLabels = Number.isFinite(options.maxLabels)
    ? Math.max(0, Math.floor(options.maxLabels ?? 3))
    : 3;
  const pins = [...unique.values(), ...(options.obstacles ?? [])].filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  type Box = { left: number; top: number; right: number; bottom: number };
  const overlaps = (a: Box, b: Box) =>
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top;
  const occupied: Box[] = [];
  for (const node of ordered) {
    if (result.size >= maxLabels) break;
    const limit = node.id === options.selectedId ? 160 : 132;
    const width = Math.min(
      limit,
      Math.max(72, Number.isFinite(node.width) ? (node.width ?? limit) : limit),
      2 * Math.min(node.x - options.left, options.right - node.x),
    );
    if (width < 72) continue;
    const height = Math.min(
      40,
      Math.max(24, Number.isFinite(node.height) ? (node.height ?? 40) : 40),
    );
    const left = node.x - width / 2;
    for (const side of ["top", "bottom"] as const) {
      const top = side === "top" ? node.y - 28 - height : node.y + 28;
      const box = { left, right: left + width, top, bottom: top + height };
      if (
        box.left < options.left ||
        box.right > options.right ||
        box.top < options.top ||
        box.bottom > options.bottom ||
        (node.id !== options.selectedId &&
          pins.some(
            (pin) =>
              pin.id !== node.id &&
              overlaps(box, {
                left: pin.x - 22,
                right: pin.x + 22,
                top: pin.y - 22,
                bottom: pin.y + 22,
              }),
          )) ||
        occupied.some((other) => overlaps(box, other))
      ) {
        continue;
      }
      result.set(node.id, { side, maxWidth: width, height });
      occupied.push(box);
      break;
    }
  }
  return result;
}
