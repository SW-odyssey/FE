import { getCoursePlaceDetail, v2Place, type ApiPlace } from "./course-api.ts";
import {
  areaCenter,
  invalidateServiceMeta,
  isMissingDatasetResponse,
  loadServiceMeta,
  selectDataset,
} from "./service-meta.ts";
import { getV2Data, v2Time, V2RequestError } from "./v2-client.ts";
import { previewDataSource } from "./preview.ts";
import type { DiscoveryDataSource, DiscoveryQuery } from "./types.ts";

/** Create the v2 source for the normal discovery screens. */
export function createLiveDiscoveryDataSource(): DiscoveryDataSource {
  async function context(input: DiscoveryQuery, signal?: AbortSignal) {
    if (!input.visitDate) throw new Error("Missing Seoul visit date");
    const meta = await loadServiceMeta(signal);
    const dataset = selectDataset(meta, input.datasetId);
    const { weekday, slot } = v2Time(input.visitDate, input.slot);
    return { meta, dataset, weekday, slot };
  }

  return {
    async query(input, { signal } = {}) {
      const { meta, dataset, weekday, slot } = await context(input, signal);
      const center = input.origin ?? areaCenter(meta, input.area);
      if (!center) throw new Error("No service area in metadata");
      const { lat, lng } = center;
      const params = new URLSearchParams({
        datasetId: dataset.id,
        weekday,
        slot,
        lat: String(lat),
        lng: String(lng),
        category: input.category === "culture" ? "all" : input.category,
      });
      const q = input.query.trim().slice(0, 80);
      if (q) params.set("q", q);
      if (input.language) params.set("lang", input.language);
      let data;
      try {
        data = await getV2Data<{
          items: (ApiPlace & { cellId: string })[];
        }>("recommendations", signal, params);
      } catch (error) {
        if (isMissingDatasetResponse(error)) invalidateServiceMeta();
        throw error;
      }
      const items = data.items
        .filter(
          ({ kind }) =>
            kind === "cafe" ||
            kind === "korean" ||
            kind === "other" ||
            (!q && kind === "bar"),
        )
        .map(v2Place);
      return { items, total: items.length };
    },
    async getPlace(id, { signal, query } = {}) {
      if (!/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)))
        return previewDataSource.snapshot?.getPlace(id) ?? null;
      const detail = await getCoursePlaceDetail(
        id,
        signal,
        query?.language,
      ).catch((error) => {
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
          datasetId: scope.dataset.id,
          referenceMonth: scope.dataset.referenceMonth,
          weekday: scope.weekday,
        },
      };
    },
  };
}

export const liveDiscoveryDataSource = createLiveDiscoveryDataSource();
