"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createLatestRequest } from "../data/latest-request.ts";
import { previewDataSource } from "../data/preview.ts";
import { copyDiscoveryQuery, discoveryQueryKey } from "../data/query.ts";
import type {
  DiscoveryDataSource,
  DiscoveryPlaceDetail,
  DiscoveryQuery,
  DiscoveryQueryResult,
  DiscoveryResource,
} from "../data/types";
import type { DiscoveryLanguage, LocalPlace } from "../model";
const emptyQuery: DiscoveryQueryResult = { items: [], total: 0 };
type ResourceState<T> = DiscoveryResource<T> & {
  source: DiscoveryDataSource;
  key: string;
  attempt: number;
};
function useSourceResource<T>({
  source,
  key,
  snapshot,
  load,
  empty,
  enabled = true,
  keepPrevious = false,
  attempt,
}: {
  source: DiscoveryDataSource;
  key: string;
  snapshot: T | undefined;
  load: (signal: AbortSignal) => Promise<T>;
  empty: T;
  enabled?: boolean;
  keepPrevious?: boolean;
  attempt: number;
}): DiscoveryResource<T> {
  const synchronous = Boolean(source.snapshot);
  const [state, setState] = useState<ResourceState<T>>(() => ({
    source,
    key,
    attempt,
    value: snapshot ?? empty,
    status: enabled ? (synchronous ? "success" : "loading") : "idle",
    error: null,
  }));
  const lane = useMemo(() => createLatestRequest<T>(), []);
  useEffect(() => {
    if (!enabled || synchronous) {
      lane.cancel();
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 요청이 시작될 때 해당 요청의 로딩 상태를 노출합니다.
    setState((previous) => ({
      source,
      key,
      attempt,
      value:
        keepPrevious && previous.source === source ? previous.value : empty,
      status: "loading",
      error: null,
    }));
    return lane.run(load, {
      resolve(value) {
        setState({
          source,
          key,
          attempt,
          value,
          status: "success",
          error: null,
        });
      },
      reject(error) {
        setState((previous) => ({
          source,
          key,
          attempt,
          value:
            keepPrevious && previous.source === source ? previous.value : empty,
          status: "error",
          error,
        }));
      },
    });
  }, [
    source,
    key,
    attempt,
    synchronous,
    enabled,
    keepPrevious,
    empty,
    lane,
    load,
  ]);
  if (!enabled) return { value: empty, status: "idle", error: null };
  if (synchronous)
    return { value: snapshot ?? empty, status: "success", error: null };
  if (state.source === source && state.key === key && state.attempt === attempt)
    return state;
  return {
    value: keepPrevious && state.source === source ? state.value : empty,
    status: "loading",
    error: null,
  };
}
/**
 * @param options Screen-derived applied/draft inputs and optional replacement source
 * @returns Immediate preview values or cancellable async resources. retry restarts
 * all active async lanes; synchronous snapshots keep their existing render timing.
 */
export function useDiscoveryData({
  query,
  draftQuery = query,
  selectedId,
  source = previewDataSource,
}: {
  query: DiscoveryQuery;
  draftQuery?: DiscoveryQuery;
  selectedId: string | null;
  source?: DiscoveryDataSource;
}) {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    if (!source.snapshot) setAttempt((previous) => previous + 1);
  }, [source]);
  const key = discoveryQueryKey(query);
  const draftKey = discoveryQueryKey(draftQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key는 query 전체 필드의 직렬화 값이며 같은 조건의 요청 참조를 유지합니다.
  const appliedInput = useMemo(() => copyDiscoveryQuery(query), [key]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- draftKey도 임시 query 전체 필드를 포함합니다.
  const draftInput = useMemo(() => copyDiscoveryQuery(draftQuery), [draftKey]);
  const snapshot = useMemo(
    () => source.snapshot?.query(appliedInput),
    [source, appliedInput],
  );
  const draftSnapshot = useMemo(
    () => (draftKey === key ? snapshot : source.snapshot?.query(draftInput)),
    [source, draftInput, draftKey, key, snapshot],
  );
  const detailSnapshot = useMemo(
    () => (selectedId ? source.snapshot?.getPlace(selectedId) : null),
    [source, selectedId],
  );
  const loadApplied = useCallback(
    (signal: AbortSignal) => source.query(appliedInput, { signal }),
    [source, appliedInput],
  );
  const loadDraft = useCallback(
    (signal: AbortSignal) => source.query(draftInput, { signal }),
    [source, draftInput],
  );
  const loadDetail = useCallback(
    (signal: AbortSignal) => source.getPlace(selectedId!, { signal }),
    [source, selectedId],
  );
  const result = useSourceResource({
    source,
    key,
    attempt,
    snapshot,
    empty: emptyQuery,
    keepPrevious: true,
    load: loadApplied,
  });
  const draft = useSourceResource({
    source,
    key: draftKey,
    attempt,
    snapshot: draftSnapshot,
    empty: emptyQuery,
    keepPrevious: true,
    enabled: draftKey !== key,
    load: loadDraft,
  });
  const detail = useSourceResource<DiscoveryPlaceDetail | null>({
    source,
    key: selectedId ?? "",
    attempt,
    snapshot: detailSnapshot,
    empty: null,
    enabled: Boolean(selectedId),
    load: loadDetail,
  });
  const activeDraft = draftKey === key ? result : draft;
  const readDetail = useCallback(
    (place: LocalPlace) =>
      (detail.value?.place.id === place.id ? detail.value : null) ??
      source.snapshot?.getPlace(place.id),
    [source, detail.value],
  );
  const photosFor = useCallback(
    (place: LocalPlace) => readDetail(place)?.photos ?? [],
    [readDetail],
  );
  const summaryFor = useCallback(
    (place: LocalPlace, language: DiscoveryLanguage) =>
      readDetail(place)?.summaries[language] ??
      (language === "ko"
        ? (place.summaryKo ?? place.descriptionKo)
        : (place.summaryEn ?? place.descriptionEn)),
    [readDetail],
  );
  const descriptionFor = useCallback(
    (place: LocalPlace, language: DiscoveryLanguage) =>
      readDetail(place)?.descriptions[language] ??
      (language === "ko" ? place.descriptionKo : place.descriptionEn),
    [readDetail],
  );
  const lookupPlace = useCallback(
    (id: string) =>
      source.snapshot?.getPlace(id)?.place ??
      (detail.value?.place.id === id ? detail.value.place : undefined) ??
      result.value.items.find((place) => place.id === id),
    [source, detail.value, result.value.items],
  );
  return {
    visible: result.value.items,
    total: result.value.total,
    draftCount: activeDraft.value.total,
    selected: detail.value?.place,
    selectedDetail: detail.value ?? undefined,
    status: result.status,
    error: result.error,
    draftStatus: activeDraft.status,
    draftError: activeDraft.error,
    detailStatus: detail.status,
    detailError: detail.error,
    retry,
    photosFor,
    summaryFor,
    descriptionFor,
    lookupPlace,
  };
}
