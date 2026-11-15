import type {
  ApiRestaurant,
  LiveCheck,
  ReviewCondition,
  ReviewDataset,
  PeerComparison,
  HistoricalPatterns,
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

/** A time-vs-time claim cannot substitute for an advantage over current alternatives. */
export function peerComparison(
  value: unknown,
  matched: boolean,
  complete: boolean,
  context: unknown,
): PeerComparison {
  const data = object(value);
  const status = data.status;
  const texts = object(data.texts),
    decision = object(data.decisionTexts);
  if (
    ![
      "distinct",
      "no_supported_advantage",
      "insufficient_evidence",
      "not_recommended",
    ].includes(String(status)) ||
    data.methodVersion !== "same_condition_peers_v1" ||
    data.unit !== "other_candidate_grids" ||
    !Number.isSafeInteger(data.expectedPeerAreas) ||
    !Number.isSafeInteger(data.observedPeerAreas) ||
    (data.expectedPeerAreas as number) < 0 ||
    (data.observedPeerAreas as number) < 0 ||
    (data.observedPeerAreas as number) > (data.expectedPeerAreas as number) ||
    !["ko", "en", "ja"].every(
      (k) => typeof texts[k] === "string" && typeof decision[k] === "string",
    )
  )
    throw new Error("INVALID_PEER_COMPARISON");
  if (status === "distinct") {
    if (
      !matched ||
      !complete ||
      !["visitor", "worker_share", "resident_share"].includes(
        String(data.feature),
      ) ||
      (data.observedPeerAreas as number) < 10 ||
      (data.observedPeerAreas as number) / (data.expectedPeerAreas as number) <
        0.9 ||
      object(context).kind !== "same_condition_peer_comparison"
    )
      throw new Error("PEER_ADVANTAGE_NOT_SUPPORTED");
  } else if (context !== null || data.feature !== null)
    throw new Error("TEMPORAL_CONTEXT_NOT_PEER_ADVANTAGE");
  if (status === "not_recommended" && (matched || !complete))
    throw new Error("GLOBAL_EXCLUSION_NOT_VERIFIED");
  return data as unknown as PeerComparison;
}

/** Exactly four observed windows; missing values must not be rendered as zero hours. */
export function historicalPatterns(
  value: unknown,
  year: number,
): HistoricalPatterns {
  const data = object(value),
    slots = ["LUNCH", "AFTERNOON", "DINNER", "LATE_NIGHT"];
  if (
    data.sourceYear !== year ||
    data.measure !== "surrounding_domestic_20s_30s_visitor_indicator" ||
    data.normalization !== "per_day_maximum_not_comparable_between_places" ||
    !Array.isArray(data.slots) ||
    data.slots.join("|") !== slots.join("|") ||
    !Array.isArray(data.months) ||
    !data.months.length ||
    data.months.length > 12 ||
    typeof data.sourceArtifact !== "string"
  )
    throw new Error("INVALID_HISTORICAL_PATTERN");
  const seen = new Set<number>();
  for (const item of data.months) {
    const month = object(item);
    if (
      !Number.isSafeInteger(month.month) ||
      (month.month as number) < 1 ||
      (month.month as number) > 12 ||
      seen.has(month.month as number) ||
      !Array.isArray(month.days) ||
      month.days.length !== 4
    )
      throw new Error("INVALID_PATTERN_MONTH");
    seen.add(month.month as number);
    const days = new Set<string>();
    for (const item of month.days) {
      const day = object(item);
      if (
        !["MON_THU", "FRI", "SAT", "SUN"].includes(String(day.dayGroup)) ||
        days.has(String(day.dayGroup)) ||
        !Array.isArray(day.peakSlots) ||
        day.peakSlots.some((v) => !slots.includes(v)) ||
        new Set(day.peakSlots).size !== day.peakSlots.length
      )
        throw new Error("INVALID_PATTERN_DAY");
      days.add(String(day.dayGroup));
      if (day.status === "available") {
        if (
          !Array.isArray(day.bars) ||
          day.bars.length !== 4 ||
          !day.bars.every(
            (v) =>
              typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100,
          ) ||
          Math.max(...day.bars) !== 100 ||
          !day.peakSlots.length
        )
          throw new Error("INVALID_FOUR_WINDOW_BARS");
      } else if (
        !["incomplete", "insufficient_indicator"].includes(
          String(day.status),
        ) ||
        day.bars !== null ||
        day.peakSlots.length !== 0
      )
        throw new Error("MISSING_PATTERN_MUST_NOT_BE_ZERO");
    }
    if (
      month.representativePeak !== undefined &&
      month.representativePeak !== null
    ) {
      const peak = object(month.representativePeak);
      if (
        !["MON_THU", "FRI", "SAT", "SUN"].includes(String(peak.dayGroup)) ||
        !slots.includes(String(peak.slot)) ||
        month.days.some((value) => object(value).status === "incomplete") ||
        !month.days.some(
          (value) =>
            object(value).dayGroup === peak.dayGroup &&
            object(value).status === "available",
        )
      )
        throw new Error("INCOMPLETE_WEEK_CANNOT_HAVE_A_SINGLE_PEAK");
    }
  }
  return data as unknown as HistoricalPatterns;
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
    root.stores.length > 6 ||
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
  if (
    root.comparisonVersion !== undefined &&
    root.comparisonVersion !== "same_condition_peers_v1"
  )
    throw new Error("UNSUPPORTED_PEER_VERSION");
  for (const value of root.stores) {
    const row = object(value);
    const store = restaurant(row);
    if (ids.has(store.id)) throw new Error("DUPLICATE_REVIEW_STORE");
    ids.add(store.id);
    if (root.comparisonVersion || row.historicalPatterns !== undefined)
      historicalPatterns(row.historicalPatterns, root.sourceYear as number);
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
      if (root.comparisonVersion || item.peerComparison !== undefined)
        peerComparison(
          item.peerComparison,
          snapshot.matched as boolean,
          snapshot.complete as boolean,
          item.context,
        );
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
