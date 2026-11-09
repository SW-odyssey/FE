export type SheetState = "collapsed" | "half" | "expanded";

export const sheetHeights: Record<SheetState, number> = {
  collapsed: 88,
  half: 320,
  expanded: 500,
};

/** Small, bounded resistance beyond either end; no hard stop under a finger. */
export function resistSheetHeight(height: number, maximum = 500) {
  const edge = Math.max(sheetHeights.collapsed, Math.min(maximum, height));
  const extra = height - edge;
  return edge + Math.sign(extra) * 20 * (1 - Math.exp(-Math.abs(extra) / 80));
}

/** Velocity is in design pixels/ms, positive when opening the sheet. */
export function sheetSnapTarget(
  height: number,
  velocity: number,
  start: number,
  maximum = 500,
) {
  const stops = [sheetHeights.collapsed, sheetHeights.half, maximum];
  // Tiny movements remain a tap; a paused drag has no residual flick velocity.
  const projected =
    Math.abs(height - start) < 8
      ? start
      : height + Math.max(-220, Math.min(220, velocity * 180));
  return stops.reduce((nearest, stop) =>
    Math.abs(stop - projected) < Math.abs(nearest - projected) ? stop : nearest,
  );
}

/** Exact critically damped spring step. Velocity here is pixels/second. */
export function stepSheetSpring(
  position: number,
  velocity: number,
  target: number,
  seconds: number,
) {
  const omega = 24;
  const offset = position - target;
  const term = velocity + omega * offset;
  const decay = Math.exp(-omega * seconds);
  return {
    position: target + (offset + term * seconds) * decay,
    velocity: (velocity - omega * term * seconds) * decay,
  };
}
