import type {
  ApiRestaurant,
  LiveCheck,
  ReviewCondition,
  ReviewDataset,
} from "./types.ts";

/** @returns A record only for a JSON object; malformed provider responses fail closed. */
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID_REVIEW_RESPONSE");
  return value as Record<string, unknown>;
}

/** @returns The provider's weekday group for an already-derived Seoul calendar date. */
export function weekdayGroup(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new Error("INVALID_CALENDAR_DATE");
  const day = parsed.getUTCDay();
  return day === 0 ? "SUN" : day === 6 ? "SAT" : day === 5 ? "FRI" : "MON_THU";
}

/** @returns Only navigable public HTTPS links, never javascript/data or credentialed URLs. */
export function publicLink(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.href;
  } catch {
    /* Missing provider links are optional. */
  }
}

/** @returns The same supported restaurant fields, retaining server identity and order. */
export function restaurant(value: unknown): ApiRestaurant {
  const row = object(value);
  if (
    !Number.isSafeInteger(row.id) ||
    !Number.isSafeInteger(row.cellId) ||
    typeof row.name !== "string" ||
    !row.name ||
    row.category !== "food" ||
    row.foodType !== "korean" ||
    typeof row.areaId !== "string" ||
    typeof row.googlePlaceId !== "string" ||
    !/^[A-Za-z0-9_-]{5,255}$/.test(row.googlePlaceId)
  )
    throw new Error("INVALID_RESTAURANT_IDENTITY");
  return {
    id: row.id as number,
    name: row.name,
    cellId: row.cellId as number,
    category: "food",
    foodType: "korean",
    areaId: row.areaId,
    googlePlaceId: row.googlePlaceId,
  };
}

/** @returns The recorded dataset after checking every restaurant/condition/context join. */
export function reviewDataset(value: unknown): ReviewDataset {
  const root = object(value);
  if (
    root.schemaVersion !== 1 ||
    typeof root.version !== "string" ||
    !/^[a-f0-9]{64}$/.test(root.version) ||
    !Array.isArray(root.conditions) ||
    root.conditions.length !== 6 ||
    !Array.isArray(root.stores) ||
    root.stores.length < 1 ||
    root.stores.length > 3 ||
    typeof root.generatedAt !== "string" ||
    !Number.isFinite(Date.parse(root.generatedAt)) ||
    !Number.isInteger(root.sourceYear)
  )
    throw new Error("INVALID_REVIEW_DATASET");
  const conditions = root.conditions.map((value) => {
    const row = object(value);
    const request = object(row.request);
    const label = object(row.label);
    if (
      typeof row.id !== "string" ||
      !/^[a-z_]+$/.test(row.id) ||
      typeof row.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      !["lunch", "dinner"].includes(String(row.slot)) ||
      !["any", "less_busy"].includes(String(row.density)) ||
      !["ko", "en", "ja"].every((k) => typeof label[k] === "string") ||
      request.category !== "food" ||
      request.foodType !== "korean" ||
      request.areaId !== "jongno" ||
      request.visitDate !== row.date ||
      request.slot !== row.slot ||
      request.density !== row.density ||
      request.since !== "false" ||
      request.q !== "" ||
      request.page !== "0" ||
      Object.keys(request).some(
        (k) =>
          ![
            "areaId",
            "category",
            "foodType",
            "since",
            "visitDate",
            "slot",
            "density",
            "q",
            "page",
          ].includes(k),
      )
    )
      throw new Error("INVALID_REVIEW_CONDITION");
    return row as unknown as ReviewCondition;
  });
  if (new Set(conditions.map((c) => c.id)).size !== 6)
    throw new Error("DUPLICATE_REVIEW_CONDITION");
  const ids = new Set<number>();
  for (const value of root.stores) {
    const row = object(value);
    const store = restaurant(row);
    if (ids.has(store.id)) throw new Error("DUPLICATE_REVIEW_STORE");
    ids.add(store.id);
    if (!Array.isArray(row.cases) || row.cases.length !== 6)
      throw new Error("MISSING_REVIEW_CASES");
    const seen = new Set<string>();
    for (const value of row.cases) {
      const item = object(value);
      const condition = conditions.find((c) => c.id === item.conditionId);
      if (!condition || seen.has(condition.id))
        throw new Error("INVALID_REVIEW_CASE_JOIN");
      seen.add(condition.id);
      const snapshot = object(item.snapshot);
      if (
        typeof snapshot.matched !== "boolean" ||
        typeof snapshot.complete !== "boolean" ||
        !Number.isSafeInteger(snapshot.checkedCount) ||
        (snapshot.checkedCount as number) < 0 ||
        typeof snapshot.receivedAt !== "string" ||
        !Number.isFinite(Date.parse(snapshot.receivedAt)) ||
        typeof item.engineExactOrderMatch !== "boolean" ||
        !Array.isArray(snapshot.pages) ||
        !snapshot.pages.length ||
        !Array.isArray(snapshot.topItems)
      )
        throw new Error("INVALID_REVIEW_SNAPSHOT");
      for (const top of snapshot.topItems) restaurant(top);
      if (
        snapshot.matched &&
        (!Number.isSafeInteger(snapshot.rank) ||
          (snapshot.rank as number) < 1 ||
          !Number.isSafeInteger(snapshot.page) ||
          (snapshot.page as number) < 0 ||
          !Number.isSafeInteger(snapshot.positionInPage) ||
          (snapshot.positionInPage as number) < 1 ||
          (snapshot.positionInPage as number) > 30 ||
          snapshot.rank !==
            (snapshot.page as number) * 30 +
              (snapshot.positionInPage as number))
      )
        throw new Error("INVALID_RECORDED_POSITION");
      for (const value of snapshot.pages) {
        const receipt = object(value);
        if (
          !Number.isSafeInteger(receipt.page) ||
          (receipt.page as number) < 0 ||
          !Number.isSafeInteger(receipt.count) ||
          (receipt.count as number) < 0 ||
          (receipt.count as number) > 30 ||
          typeof receipt.responseSha256 !== "string" ||
          !/^[a-f0-9]{64}$/.test(receipt.responseSha256)
        )
          throw new Error("INVALID_PAGE_RECEIPT");
      }
      if (item.context !== null) {
        const context = object(item.context),
          scope = object(context.scope),
          texts = object(context.texts);
        if (
          scope.sourceYear !== root.sourceYear ||
          scope.weekdayGroup !== weekdayGroup(condition.date) ||
          scope.month !== Number(condition.date.slice(5, 7)) ||
          scope.selectedSlot !== condition.slot.toUpperCase() ||
          typeof context.evidenceId !== "string" ||
          typeof context.subjectRef !== "string" ||
          !context.subjectRef.startsWith("grid_") ||
          !["ko", "en", "ja"].every((k) => typeof texts[k] === "string") ||
          !Array.isArray(context.sourceArtifacts)
        )
          throw new Error("CONTEXT_SCOPE_MISMATCH");
      }
    }
  }
  return { ...root, conditions } as unknown as ReviewDataset;
}

/** Validate the applied scope before accepting any position from a fresh response. */
export function checkedPage(
  payload: unknown,
  condition: ReviewCondition,
  page: number,
) {
  const body = object(payload),
    data = object(body.data),
    applied = object(data.applied);
  if (
    body.success !== true ||
    applied.visitDate !== condition.date ||
    applied.dayType !== weekdayGroup(condition.date).toLowerCase() ||
    applied.slot !== condition.slot ||
    data.page !== page ||
    typeof data.hasNext !== "boolean" ||
    !Array.isArray(data.items) ||
    data.items.length > 30
  )
    throw new Error("LIVE_SCOPE_OR_PAGE_MISMATCH");
  const items = data.items.map(restaurant);
  if (items.some((item) => item.areaId !== condition.request.areaId))
    throw new Error("LIVE_AREA_MISMATCH");
  if (new Set(items.map((i) => i.id)).size !== items.length)
    throw new Error("DUPLICATE_LIVE_STORE");
  return { page, items, hasNext: data.hasNext };
}

/** Missing from sampled pages means unconfirmed, never absent from the entire engine. */
export function liveCheck(
  pages: ReturnType<typeof checkedPage>[],
  target: ApiRestaurant,
  receivedAt: string,
): LiveCheck {
  let rank: number | null = null;
  for (const page of pages) {
    const offset = page.items.findIndex((item) => item.id === target.id);
    if (offset < 0) continue;
    const found = page.items[offset];
    if (
      found.name !== target.name ||
      found.cellId !== target.cellId ||
      found.googlePlaceId !== target.googlePlaceId
    )
      throw new Error("LIVE_RESTAURANT_IDENTITY_CHANGED");
    if (rank !== null) throw new Error("DUPLICATE_LIVE_STORE");
    rank = page.page * 30 + offset + 1;
  }
  return {
    status: rank === null ? "not_seen_in_checked_pages" : "confirmed",
    rank,
    checkedPages: pages.map((p) => p.page),
    receivedAt,
    topItems: pages.find((p) => p.page === 0)?.items.slice(0, 5) ?? [],
  };
}
