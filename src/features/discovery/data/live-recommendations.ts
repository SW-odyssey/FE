import {
  courseOrigin,
  getCoursePlaceDetail,
  v2Place,
  type ApiPlace,
} from "./course-api.ts";
import {
  getPublishedDataset,
  getV2Data,
  v2Time,
  V2RequestError,
} from "./v2-client.ts";
import { previewDataSource } from "./preview.ts";
import type {
  CellReasonCode,
  DiscoveryDataSource,
  DiscoveryQuery,
} from "./types.ts";

type CellEvidence = {
  reasonsByCellId: Record<
    string,
    { status: string; reasons: { code: CellReasonCode }[] }
  >;
};

/** Create the v2 source for the normal discovery screens. */
export function createLiveDiscoveryDataSource(): DiscoveryDataSource {
  let published: Promise<string> | undefined;

  function dataset(signal?: AbortSignal) {
    signal?.throwIfAborted();
    published ??= getPublishedDataset(AbortSignal.timeout(15_000)).catch(
      (error) => {
        published = undefined;
        throw error;
      },
    );
    return published;
  }

  async function context(input: DiscoveryQuery, signal?: AbortSignal) {
    if (!input.visitDate) throw new Error("Missing Seoul visit date");
    const datasetId = input.datasetId ?? (await dataset(signal));
    signal?.throwIfAborted();
    return { datasetId, ...v2Time(input.visitDate, input.slot) };
  }

  return {
    async query(input, { signal } = {}) {
      const scope = await context(input, signal);
      const { lat, lng } = input.origin ?? courseOrigin(input.area);
      const params = new URLSearchParams({
        ...scope,
        lat: String(lat),
        lng: String(lng),
        category: input.category === "culture" ? "all" : input.category,
      });
      const q = input.query.trim().slice(0, 80);
      if (q) params.set("q", q);
      let data;
      try {
        data = await getV2Data<{
          items: (ApiPlace & { cellId: string })[];
          total: number;
        }>("recommendations", signal, params);
      } catch (error) {
        if (error instanceof V2RequestError && error.status === 404)
          published = undefined;
        throw error;
      }
      const items = data.items.map(v2Place);
      const cellIds = [...new Set(data.items.map(({ cellId }) => cellId))];
      if (!cellIds.length) return { items, total: data.total };
      const reasons = await getV2Data<CellEvidence>(
        "cells/reasons",
        signal,
        new URLSearchParams({ ...scope, cellIds: cellIds.join(",") }),
      ).catch(() => undefined);
      signal?.throwIfAborted();
      const cellReasons = Object.fromEntries(
        Object.entries(reasons?.reasonsByCellId ?? {})
          .filter(([, entry]) => entry.status === "AVAILABLE")
          .map(([id, { reasons }]) => [id, reasons.map(({ code }) => code)]),
      );
      return { items, total: data.total, cellReasons };
    },
    async getPlace(id, { signal, query } = {}) {
      if (!/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)))
        return previewDataSource.snapshot?.getPlace(id) ?? null;
      const detail = await getCoursePlaceDetail(id, signal).catch((error) => {
        if (error instanceof V2RequestError && error.status === 404)
          return null;
        throw error;
      });
      if (!detail?.place.cellId || !query?.visitDate) return detail;
      const scope = await context(query, signal).catch(() => undefined);
      signal?.throwIfAborted();
      if (!scope) return detail;
      return {
        ...detail,
        visitPattern: {
          provenance: "live",
          cellId: detail.place.cellId,
          datasetId: scope.datasetId,
          weekday: scope.weekday,
        },
      };
    },
  };
}

export const liveDiscoveryDataSource = createLiveDiscoveryDataSource();
