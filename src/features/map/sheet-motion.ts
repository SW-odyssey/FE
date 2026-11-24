export type SheetState = "collapsed" | "half" | "expanded";

export const sheetHeights: Record<SheetState, number> = {
  collapsed: 88,
  half: 320,
  expanded: 500,
};

/** Fit the map sheet's three stops within the room below the map controls.
 * @param availableHeight Space in CSS pixels above the bottom navigation
 * @param contentHeight Optional height of the complete list and its insets
 * @returns Heights for the collapsed, half and expanded sheet states
 */
export function sheetHeightsForSpace(
  availableHeight: number,
  contentHeight = Number.POSITIVE_INFINITY,
) {
  const collapsed = sheetHeights.collapsed;
  const expanded = Math.min(
    sheetHeights.expanded,
    Math.max(collapsed, availableHeight),
  );
  const middle =
    (sheetHeights.half - collapsed) / (sheetHeights.expanded - collapsed);
  const contentCap = Math.max(collapsed, contentHeight);
  // Let short course lists use their padding without adding a nearly identical snap.
  const shortListFits =
    contentCap <= Math.min(sheetHeights.half + 12, expanded);
  return {
    collapsed,
    half: shortListFits
      ? contentCap
      : Math.round(collapsed + (expanded - collapsed) * middle),
    expanded: Math.min(contentCap, expanded),
  };
}

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
  contentHeight?: number,
) {
  const { collapsed, half, expanded } = sheetHeightsForSpace(
    maximum,
    contentHeight,
  );
  const stops = [collapsed, half, expanded];
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
