import { getCoursePlaceDetail, v2Place, type ApiPlace } from "./course-api.ts";
import { placeSearchTerm, searchPlaces } from "./place-search.ts";
import { parseCellReasons, type CellReasonCode } from "../cell-reasons.ts";
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

type Scope = { dataset: { id: string }; weekday: string; slot: string };

/**
 * Read the reasons of the cells on one list page with one request
 * (GET /api/v2/cells/reasons accepts up to 30 cells).
 *
 * @returns Reasons by cell ID. A failed lookup leaves the cards without
 * reasons instead of failing the list; an abort still rejects.
 */
async function cellReasons(
  places: readonly LocalPlace[],
  scope: Scope,
  signal?: AbortSignal,
): Promise<Record<string, CellReasonCode[]>> {
  const ids = [
    ...new Set(places.flatMap(({ cellId }) => (cellId ? [cellId] : []))),
  ].filter((id) => /^\d{1,19}$/.test(id));
  const chunks = [];
  for (let start = 0; start < ids.length; start += 30)
    chunks.push(ids.slice(start, start + 30));
  const found = await Promise.all(
    chunks.map((chunk) =>
      getV2Data<{ reasonsByCellId?: unknown }>(
        "cells/reasons",
        signal,
        new URLSearchParams({
          datasetId: scope.dataset.id,
          weekday: scope.weekday,
          slot: scope.slot,
          cellIds: chunk.join(","),
        }),
      ).then(
        (data) =>
          // Keep only the cells this lookup asked for.
          Object.fromEntries(
            Object.entries(parseCellReasons(data.reasonsByCellId)).filter(
              ([id]) => chunk.includes(id),
            ),
          ),
        () => {
          signal?.throwIfAborted();
          return {};
        },
      ),
    ),
  );
  return Object.assign({}, ...found);
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
    return {
      items,
      total: items.length,
      cellReasons: await cellReasons(items, scope, signal),
    };
  }

  async function areaPage(
    input: DiscoveryQuery,
    page: number,
    signal?: AbortSignal,
  ) {
    const scope = await context(input, signal);
    const { meta, dataset, weekday, slot } = scope;
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
    const data = await request<ApiAreaPage>(
      "area-recommendations",
      params,
      signal,
    );
    return { data, scope };
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
      const { data, scope } = await areaPage(input, 0, signal);
      const items = uniquePlaces([], data.items);
      return {
        items,
        total: data.total,
        page: data.page,
        hasNext: data.hasNext,
        cellReasons: await cellReasons(items, scope, signal),
      };
    },
    async queryNext(input, previous, { signal } = {}) {
      if (!previous.hasNext) return previous;
      const page = (previous.page ?? 0) + 1;
      const { data, scope } = await areaPage(input, page, signal);
      const items = uniquePlaces(previous.items, data.items);
      // Only cells that are new on this page need a lookup.
      const known = previous.cellReasons ?? {};
      const added = items
        .slice(previous.items.length)
        .filter(({ cellId }) => !cellId || !Object.hasOwn(known, cellId));
      return {
        items,
        total: data.total,
        page: data.page,
        hasNext: data.hasNext,
        cellReasons: {
          ...known,
          ...(await cellReasons(added, scope, signal)),
        },
      };
    },
    async getPlace(id, { signal, query } = {}) {
      // Server places have numeric IDs. Sample slugs from old links are not
      // real places, so the live app shows "place unavailable" (#80).
      if (!/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)))
        return null;
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
