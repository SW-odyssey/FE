import type { AreaId, Coordinate, DiscoveryArea, VisitSlot } from "../model.ts";
import type { ApiSlot } from "./api-mapping.ts";
import { getV2Data, V2RequestError } from "./v2-client.ts";

/** A published U+ batch. `referenceMonth` is the YYYY-MM the data describes. */
export type ServiceDataset = { id: string; referenceMonth: string };
/** A service area from GET /api/v2/meta; `name` is the Korean server label. */
export type ServiceArea = { id: AreaId; name: string; center: Coordinate };
/** A clock range in Asia/Seoul. `endsNextDay` means `toExclusive` is after midnight. */
export type ClockWindow = {
  from: string;
  toExclusive: string;
  endsNextDay: boolean;
};
export type SlotWindow = ClockWindow & { slot: VisitSlot };
export type ServiceMeta = {
  defaultDatasetId: string | null;
  datasets: ServiceDataset[];
  areas: ServiceArea[];
  slotWindows: SlotWindow[];
  serviceHours: ClockWindow | null;
};

type RawMeta = {
  defaultDatasetId?: unknown;
  datasets?: unknown;
  areas?: unknown;
  slotWindows?: unknown;
  serviceHours?: unknown;
};

/** The published metadata has no dataset the screens can request. */
export class MissingDatasetError extends Error {
  constructor() {
    super("No published recommendation dataset");
  }
}

const screenSlot: Record<ApiSlot, VisitSlot> = {
  lunch: "lunch",
  afternoon: "afternoon",
  dinner: "evening",
  late_night: "late",
};
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
const datasetPattern = /^[a-zA-Z0-9-]{1,80}$/;
const areaPattern = /^[a-z][a-z0-9_-]{0,31}$/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function clockWindow(value: unknown): ClockWindow | null {
  const item = record(value);
  if (
    !item ||
    typeof item.from !== "string" ||
    typeof item.toExclusive !== "string" ||
    !clock.test(item.from) ||
    !clock.test(item.toExclusive)
  )
    return null;
  return {
    from: item.from,
    toExclusive: item.toExclusive,
    endsNextDay: item.endsNextDay === true,
  };
}

/**
 * @param raw The `data` object of GET /api/v2/meta
 * @returns Only the entries the screens can use. Invalid areas, datasets and
 * windows are dropped instead of being guessed, so a bad entry never becomes a
 * wrong coordinate or slot request.
 */
export function parseServiceMeta(raw: RawMeta): ServiceMeta {
  const datasets = (Array.isArray(raw.datasets) ? raw.datasets : []).flatMap(
    (value) => {
      const item = record(value);
      return item &&
        typeof item.id === "string" &&
        datasetPattern.test(item.id) &&
        typeof item.referenceMonth === "string" &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test(item.referenceMonth)
        ? [{ id: item.id, referenceMonth: item.referenceMonth }]
        : [];
    },
  );
  const areas = (Array.isArray(raw.areas) ? raw.areas : []).flatMap((value) => {
    const item = record(value);
    const lat = item?.centerLat;
    const lng = item?.centerLng;
    return item &&
      typeof item.id === "string" &&
      areaPattern.test(item.id) &&
      item.id !== "all" &&
      typeof item.name === "string" &&
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
      ? [{ id: item.id, name: item.name, center: { lat, lng } }]
      : [];
  });
  const slotWindows = (
    Array.isArray(raw.slotWindows) ? raw.slotWindows : []
  ).flatMap((value) => {
    const item = record(value);
    const window = clockWindow(value);
    const slot = screenSlot[item?.slot as ApiSlot];
    return window && slot ? [{ ...window, slot }] : [];
  });
  const defaultDatasetId =
    typeof raw.defaultDatasetId === "string" &&
    datasets.some(({ id }) => id === raw.defaultDatasetId)
      ? raw.defaultDatasetId
      : null;
  return {
    defaultDatasetId,
    datasets,
    areas,
    slotWindows,
    serviceHours: clockWindow(raw.serviceHours),
  };
}

/**
 * @param meta Parsed metadata
 * @param requested A dataset ID from a shared course link, if any
 * @returns The requested dataset when it is still published, otherwise the
 * server default. Without a default it picks the newest reference month, so the
 * choice never depends on the order of `datasets`.
 * @throws MissingDatasetError when nothing is published
 */
export function selectDataset(
  meta: ServiceMeta,
  requested?: string,
): ServiceDataset {
  const linked =
    requested && meta.datasets.find((dataset) => dataset.id === requested);
  if (linked) return linked;
  const fallback =
    meta.datasets.find(({ id }) => id === meta.defaultDatasetId) ??
    meta.datasets.reduce<ServiceDataset | undefined>(
      (newest, dataset) =>
        !newest || dataset.referenceMonth > newest.referenceMonth
          ? dataset
          : newest,
      undefined,
    );
  if (!fallback) throw new MissingDatasetError();
  return fallback;
}

/** @returns Whether a linked dataset is still published. */
export function hasDataset(meta: ServiceMeta, id: string): boolean {
  return meta.datasets.some((dataset) => dataset.id === id);
}

/** @returns Whether the area ID is selectable: `all` or a published area. */
export function isServiceArea(meta: ServiceMeta, area: DiscoveryArea) {
  return area === "all" || meta.areas.some(({ id }) => id === area);
}

/**
 * @param meta Parsed metadata
 * @param area Selected area; `all` is the logical whole-service option
 * @returns The area centre from the server. `all`, or an unknown ID, uses the
 * mean of the published centres; null when the server has no areas.
 */
export function areaCenter(
  meta: ServiceMeta,
  area: DiscoveryArea,
): Coordinate | null {
  const match = meta.areas.find(({ id }) => id === area);
  if (match) return match.center;
  if (!meta.areas.length) return null;
  const sum = meta.areas.reduce(
    (total, { center }) => ({
      lat: total.lat + center.lat,
      lng: total.lng + center.lng,
    }),
    { lat: 0, lng: 0 },
  );
  return {
    lat: Number((sum.lat / meta.areas.length).toFixed(6)),
    lng: Number((sum.lng / meta.areas.length).toFixed(6)),
  };
}

let shared: Promise<ServiceMeta> | undefined;
let resolved: ServiceMeta | undefined;

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

/**
 * Share one GET /api/v2/meta between the list, the course and the detail.
 *
 * @param signal Cancels only this caller's wait. The shared request keeps its
 * own 15 s timeout so another screen can still use the response.
 * @returns The parsed metadata. A failed request is forgotten so the next call
 * retries; a success is reused until {@link invalidateServiceMeta}.
 */
export function loadServiceMeta(signal?: AbortSignal): Promise<ServiceMeta> {
  signal?.throwIfAborted();
  if (!shared) {
    const request = getV2Data<RawMeta>("meta", AbortSignal.timeout(15_000))
      .then(parseServiceMeta)
      .then((meta) => {
        if (shared === request) resolved = meta;
        return meta;
      })
      .catch((error: unknown) => {
        if (shared === request) shared = undefined;
        throw error;
      });
    shared = request;
  }
  return signal ? abortable(shared, signal) : shared;
}

/** @returns The last metadata that loaded, without starting a request. */
export function peekServiceMeta(): ServiceMeta | undefined {
  return resolved;
}

/**
 * Forget the shared metadata, for example after the server reports that a
 * dataset no longer exists. The next {@link loadServiceMeta} requests it again.
 */
export function invalidateServiceMeta(): void {
  shared = undefined;
  resolved = undefined;
}

/** @returns Whether an API error means the requested dataset is not published. */
export function isMissingDatasetResponse(error: unknown): boolean {
  return error instanceof V2RequestError && error.status === 404;
}
