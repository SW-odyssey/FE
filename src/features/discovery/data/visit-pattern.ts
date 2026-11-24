import type { VisitSlot } from "../model.ts";
import { visitSlots } from "../visit-time.ts";
import type { ApiSlot } from "./api-mapping.ts";
import { getV2Data, screenSlots, type ApiWeekday } from "./v2-client.ts";

type ApiVisitPattern = {
  status: string;
  graph: { bars: { slot: ApiSlot; relativeHeight: number }[] } | null;
};

/** Fetch the published cell's relative visit pattern for the requested weekday. */
export async function getLiveVisitPattern(
  {
    datasetId,
    cellId,
    weekday,
  }: { datasetId: string; cellId: string; weekday: ApiWeekday },
  signal?: AbortSignal,
): Promise<Record<VisitSlot, number> | null> {
  const pattern = await getV2Data<ApiVisitPattern>(
    `cells/${encodeURIComponent(cellId)}/visit-pattern`,
    signal,
    new URLSearchParams({ datasetId, weekday }),
  );
  if (pattern.status !== "AVAILABLE" || pattern.graph?.bars.length !== 4)
    return null;
  const values = Object.fromEntries(
    pattern.graph.bars.map(({ slot, relativeHeight }) => [
      screenSlots[slot],
      relativeHeight,
    ]),
  ) as Record<VisitSlot, number>;
  const heights = visitSlots.map((slot) => values[slot]);
  if (
    heights.some(
      (height) => !Number.isFinite(height) || height < 0 || height > 100,
    ) ||
    heights.filter((height) => height === 100).length !== 1
  )
    return null;
  return values;
}
