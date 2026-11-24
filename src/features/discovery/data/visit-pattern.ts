import type { VisitSlot } from "../model.ts";
import { visitSlots } from "../visit-time.ts";
import type { ApiSlot } from "./api-mapping.ts";
import { getV2Data, screenSlots, type ApiWeekday } from "./v2-client.ts";

type ApiVisitPattern = {
  status: string;
  graph: {
    highlightSlot: ApiSlot | null;
    bars: { slot: ApiSlot; relativeHeight: number | null }[];
  } | null;
};

type VisitPatternGraph = {
  heights: Record<VisitSlot, number | null>;
  highlightSlot: VisitSlot | null;
};

/** 공개 배치의 요일별 상대 방문 막대와 강조 시간대를 읽습니다. */
export async function getLiveVisitPattern(
  {
    datasetId,
    cellId,
    weekday,
  }: { datasetId: string; cellId: string; weekday: ApiWeekday },
  signal?: AbortSignal,
): Promise<VisitPatternGraph | null> {
  const { status, graph } = await getV2Data<ApiVisitPattern>(
    `cells/${encodeURIComponent(cellId)}/visit-pattern`,
    signal,
    new URLSearchParams({ datasetId, weekday }),
  );
  if (!graph || graph.bars.length !== visitSlots.length) return null;

  const heights = Object.fromEntries(
    graph.bars.map(({ slot, relativeHeight }) => [
      screenSlots[slot],
      relativeHeight,
    ]),
  ) as Record<VisitSlot, number | null>;
  const values = visitSlots.map((slot) => heights[slot]);
  if (
    values.some(
      (height) =>
        height !== null &&
        (!Number.isFinite(height) || height < 0 || height > 100),
    )
  )
    return null;

  const missing = values.includes(null);
  const peaks = values.filter((value) => value === 100).length;
  if (status === "AVAILABLE") {
    const highlightSlot =
      graph.highlightSlot && screenSlots[graph.highlightSlot];
    return !missing &&
      peaks === 1 &&
      highlightSlot &&
      heights[highlightSlot] === 100
      ? { heights, highlightSlot }
      : null;
  }

  const partial =
    (status === "NO_DISTINCT_PEAK" && !missing) ||
    (status === "INCOMPLETE_TIME_SLOTS" && missing);
  return partial && peaks > 0 && graph.highlightSlot === null
    ? { heights, highlightSlot: null }
    : null;
}
