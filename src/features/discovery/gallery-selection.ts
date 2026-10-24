/** Keep scroll and button indices inside the available photo collection.
 * @param index Requested index, including overscroll or an unavailable width
 * @param count Current photo count
 * @returns A valid nonnegative index, with zero representing an empty collection
 */
export function clampPhotoIndex(index: number, count: number): number {
  if (!Number.isFinite(index) || count < 1) return 0;
  return Math.max(0, Math.min(count - 1, Math.trunc(index)));
}

/** Keep the same photo through a refresh or reorder, then clamp a removed photo.
 * @param index Last selected index
 * @param previous Previous committed photo sources
 * @param next New photo sources
 * @returns Preserved photo index or the nearest valid fallback
 */
export function resolveGalleryIndex(
  index: number,
  previous: readonly string[],
  next: readonly string[],
): number {
  const source = previous[clampPhotoIndex(index, previous.length)];
  const retained = source === undefined ? -1 : next.indexOf(source);
  return retained >= 0 ? retained : clampPhotoIndex(index, next.length);
}
