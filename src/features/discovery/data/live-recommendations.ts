import { getCoursePlaceDetail, v2Place, type ApiPlace } from "./course-api.ts";
import { placeSearchTerm, searchPlaces } from "./place-search.ts";
import type { LocalPlace } from "../model.ts";
import {
  areaCenter,
  invalidateServiceMeta,
  isMissingDatasetResponse,
  isServiceArea,
  loadServiceMeta,
  selectDataset,
} from "./service-meta.ts";
import { getV2Data, v2Time, V2RequestError } from "./v2-client.ts";
import { previewDataSource } from "./preview.ts";
import type {
  DiscoveryDataSource,
  DiscoveryQuery,
  DiscoveryQueryResult,
} from "./types.ts";

type ApiAreaPage = {
  total: number;
  page: number;
  hasNext: boolean;
  items: ApiPlace[];
};

/** BE #96 accepts at most 30 places per page. */
const areaPageSize = 30;
/** Bars are part of `food`; shopping and activities are left out on the server. */
const areaCategories: Record<DiscoveryQuery["category"], string> = {
  all: "food,cafe",
  food: "food",
  cafe: "cafe",
  culture: "food,cafe",
};

function uniquePlaces(loaded: LocalPlace[], next: ApiPlace[]): LocalPlace[] {
  const seen = new Set(loaded.map(({ id }) => id));
  const added = next.map(v2Place).filter(({ id }) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return [...loaded, ...added];
}

async function request<T>(
  resource: string,
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<T> {
  try {
    return await getV2Data<T>(resource, signal, params);
  } catch (error) {
    if (isMissingDatasetResponse(error)) invalidateServiceMeta();
    throw error;
  }
}

/** Create the v2 source for the normal discovery screens. */
export function createLiveDiscoveryDataSource(): DiscoveryDataSource {
  async function context(input: DiscoveryQuery, signal?: AbortSignal) {
    if (!input.visitDate) throw new Error("Missing Seoul visit date");
    const meta = await loadServiceMeta(signal);
    const dataset = selectDataset(meta, input.datasetId);
    const { weekday, slot } = v2Time(input.visitDate, input.slot);
    return { meta, dataset, weekday, slot };
  }

  async function nearby(
    input: DiscoveryQuery,
    scope: Awaited<ReturnType<typeof context>>,
    signal?: AbortSignal,
  ): Promise<DiscoveryQueryResult> {
    const center = input.origin ?? areaCenter(scope.meta, input.area);
    if (!center) throw new Error("No service area in metadata");
    const params = new URLSearchParams({
      datasetId: scope.dataset.id,
      weekday: scope.weekday,
      slot: scope.slot,
      lat: String(center.lat),
      lng: String(center.lng),
      category: input.category === "culture" ? "all" : input.category,
    });
    if (input.language) params.set("lang", input.language);
    const data = await request<{ items: ApiPlace[] }>(
      "recommendations",
      params,
      signal,
    );
    // The nearby route has no area paging; shopping and activities are
    // removed here, while the area route excludes them on the server.
    const items = data.items
      .filter(({ kind }) => kind !== "shop" && kind !== "play")
      .map(v2Place);
    return { items, total: items.length };
  }

  async function areaPage(
    input: DiscoveryQuery,
    page: number,
    signal?: AbortSignal,
  ) {
    const { meta, dataset, weekday, slot } = await context(input, signal);
    const params = new URLSearchParams({
      datasetId: dataset.id,
      weekday,
      slot,
      categories: areaCategories[input.category],
      page: String(page),
      size: String(areaPageSize),
    });
    if (input.area !== "all" && isServiceArea(meta, input.area))
      params.set("areaId", input.area);
    if (input.language) params.set("lang", input.language);
    return request<ApiAreaPage>("area-recommendations", params, signal);
  }

  return {
    async query(input, { signal } = {}) {
      const q = placeSearchTerm(input.query);
      if (q) {
        // Name search ignores area, time and score; only the Café and
        // Restaurant tabs narrow the server's ordered matches.
        const found = await searchPlaces(q, input.language, 30, signal);
        const items =
          input.category === "cafe" || input.category === "food"
            ? found.filter(({ category }) => category === input.category)
            : found;
        return { items, total: items.length };
      }
      // A map search or the device location uses the coordinate route.
      if (input.origin)
        return nearby(input, await context(input, signal), signal);
      const data = await areaPage(input, 0, signal);
      const items = uniquePlaces([], data.items);
      return {
        items,
        total: data.total,
        page: data.page,
        hasNext: data.hasNext,
      };
    },
    async queryNext(input, previous, { signal } = {}) {
      if (!previous.hasNext) return previous;
      const page = (previous.page ?? 0) + 1;
      const data = await areaPage(input, page, signal);
      return {
        items: uniquePlaces(previous.items, data.items),
        total: data.total,
        page: data.page,
        hasNext: data.hasNext,
      };
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
