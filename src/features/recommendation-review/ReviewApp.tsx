"use client";

import { useEffect, useState } from "react";
import { object, reviewDataset, weekdayGroup } from "./contract.ts";
import { copy } from "./copy.ts";
import { GoogleDetails } from "./GoogleDetails";
import { HistoricalPatternCard } from "./HistoricalPatternCard";
import type {
  GooglePlaceDisplay,
  LiveCheck,
  ReviewDataset,
  ReviewLanguage,
  PatternDay,
} from "./types";
import "./review.css";

type Rating = "helpful" | "weak" | "misleading";
type Feedback = {
  rating?: Rating;
  note: string;
  version: string;
  storeId: number;
  conditionId: string;
  language: ReviewLanguage;
};
type Summary = Partial<Record<Rating, number>>;
const STORAGE = "local-restaurant-review-feedback-v1";

async function action<T>(body: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch("/api/recommendation-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  const result = object(await response.json());
  if (!response.ok)
    throw new Error(String(result.error ?? `HTTP_${response.status}`));
  return result as T;
}

/** One real restaurant card, six recorded conditions, fresh checks and versioned feedback. */
export default function ReviewApp() {
  const [data, setData] = useState<ReviewDataset | null>(null);
  const [language, setLanguage] = useState<ReviewLanguage>("ko");
  const [storeId, setStoreId] = useState<number | null>(null);
  const [conditionId, setConditionId] = useState("");
  const [error, setError] = useState("");
  const [live, setLive] = useState<{
    key: string;
    data?: LiveCheck;
    error?: string;
  }>({ key: "" });
  const [google, setGoogle] = useState<{
    key: string;
    data?: GooglePlaceDisplay;
    error?: string;
    loading?: boolean;
  }>({ key: "" });
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [summary, setSummary] = useState<Summary>({});
  const [saved, setSaved] = useState("");
  const [retry, setRetry] = useState(0);
  const t = copy[language];

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/recommendation-review", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = object(await response.json());
        if (!response.ok)
          throw new Error(String(result.error ?? "REVIEW_DATA_UNAVAILABLE"));
        const dataset = reviewDataset(result.data);
        setData(dataset);
        setStoreId(dataset.stores[0].id);
        setConditionId(dataset.conditions[0].id);
        setSummary(object(result.feedbackSummary ?? {}) as Summary);
        const params = new URLSearchParams(location.search),
          lang = params.get("lang");
        if (lang === "ko" || lang === "en" || lang === "ja") setLanguage(lang);
        const place = dataset.stores.find(
          (s) => s.id === Number(params.get("store")),
        );
        if (place) setStoreId(place.id);
        if (dataset.conditions.some((c) => c.id === params.get("condition")))
          setConditionId(params.get("condition")!);
        try {
          setFeedback(JSON.parse(localStorage.getItem(STORAGE) ?? "{}"));
        } catch {
          /* Keep the review usable when device storage is unavailable. */
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(String(e.message));
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!data) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/recommendation-review?summary=1", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (response.ok) {
            const result = object(await response.json());
            setSummary(object(result.feedbackSummary ?? {}) as Summary);
          }
        })
        .catch(() => {
          /* A failed background refresh preserves the last confirmed count. */
        });
    }, 15000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [data]);

  const store = data?.stores.find((s) => s.id === storeId);
  const condition = data?.conditions.find((c) => c.id === conditionId);
  const current = store?.cases.find((c) => c.conditionId === conditionId);
  const selectionKey = `${storeId}:${conditionId}`;
  const googleKey = `${storeId}:${language}`;
  useEffect(() => {
    if (!storeId || !conditionId) return;
    const controller = new AbortController();
    const key = `${storeId}:${conditionId}`;
    action<{ data: LiveCheck }>(
      { action: "recheck", storeId, conditionId },
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setLive({ key, data: result.data });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setLive({ key, error: String(e.message) });
      });
    return () => controller.abort();
  }, [storeId, conditionId, retry]);

  useEffect(() => {
    if (!storeId || !conditionId) return;
    const params = new URLSearchParams({
      store: String(storeId),
      condition: conditionId,
      lang: language,
    });
    history.replaceState(null, "", `${location.pathname}?${params}`);
  }, [storeId, conditionId, language]);

  if (!data || !store || !condition || !current)
    return (
      <main className="review-root">
        <div className="review-shell">
          <p className="review-eyebrow">LOCAL / 추천 검토</p>
          <h1>같은 음식점, 다른 방문 조건</h1>
          <p role="status">{error ? t.unavailable : t.checking}</p>
          {error && (
            <details>
              <summary>연결 상태</summary>
              <p>{error}</p>
              <p>화면용 파생 자료의 런타임 연결을 확인해 주세요.</p>
            </details>
          )}
        </div>
      </main>
    );

  const feedbackKey = `${data.version}:${store.id}:${condition.id}:${language}`;
  const answer = feedback[feedbackKey] ?? {
    note: "",
    version: data.version,
    storeId: store.id,
    conditionId: condition.id,
    language,
  };
  const activeLive = live.key === selectionKey ? live : undefined;
  const activeGoogle = google.key === googleKey ? google : undefined;
  const top = activeLive?.data?.topItems ?? current.snapshot.topItems;
  const updateFeedback = (patch: Partial<Feedback>) => {
    setFeedback((previous) => ({
      ...previous,
      [feedbackKey]: { ...answer, ...patch },
    }));
    setSaved("");
  };
  async function saveFeedback() {
    if (!answer.rating) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(feedback));
    } catch {
      /* The server can still save this rating. */
    }
    try {
      const result = await action<{ summary: Summary }>({
        action: "feedback",
        ...answer,
      });
      setSummary(result.summary);
      setSaved(t.saved);
    } catch {
      setSaved(t.localSaved);
    }
  }
  async function loadGoogle() {
    const key = googleKey;
    setGoogle({ key, loading: true });
    try {
      const result = await action<{ data: GooglePlaceDisplay }>({
        action: "google",
        storeId: store!.id,
        language,
      });
      setGoogle({ key, data: result.data });
    } catch (e) {
      setGoogle({
        key,
        error: e instanceof Error ? e.message : "GOOGLE_UNAVAILABLE",
      });
    }
  }
  function downloadFeedback() {
    const content = {
      exportedAt: new Date().toISOString(),
      feedback: Object.values(feedback),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "local-restaurant-review-feedback.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="review-root" lang={language}>
      <div className="review-shell">
        <header className="review-header">
          <div>
            <p className="review-eyebrow">{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
          </div>
          <div className="review-language" aria-label="Language">
            {(
              [
                ["ko", "한국어"],
                ["en", "English"],
                ["ja", "日本語"],
              ] as const
            ).map(([lang, label]) => (
              <button
                key={lang}
                aria-pressed={lang === language}
                onClick={() => {
                  setLanguage(lang);
                  setSaved("");
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </header>
        <div className="review-toolbar">
          <label>
            {t.store}
            <select
              value={store.id}
              onChange={(e) => {
                setStoreId(Number(e.target.value));
                setSaved("");
              }}
            >
              {data.stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <p>{t.sample}</p>
        </div>
        <nav className="review-conditions" aria-label={t.condition}>
          {data.conditions.map((c, i) => (
            <button
              key={c.id}
              aria-pressed={c.id === conditionId}
              onClick={() => {
                setConditionId(c.id);
                setSaved("");
              }}
            >
              <small>0{i + 1}</small>
              {c.label[language]}
              <span>{c.date.slice(5).replace("-", "/")}</span>
            </button>
          ))}
        </nav>
        <div className="review-layout">
          <article className="review-card">
            <div className="review-card-heading">
              <div>
                <p className="review-eyebrow">JONGNO · KOREAN FOOD</p>
                <h2>{store.name}</h2>
              </div>
              <span className="review-rank">
                #{activeLive?.data?.rank ?? current.snapshot.rank ?? "—"}
                <small>{t.position}</small>
              </span>
            </div>
            <section className="review-selection">
              <h3>
                {language === "ko"
                  ? "같은 식사 조건에서 비교"
                  : language === "en"
                    ? "Compared with the alternatives"
                    : "同じ食事条件で比較"}
              </h3>
              <p>
                {current.peerComparison?.decisionTexts[language] ??
                  (language === "ko"
                    ? "후보 간 비교 자료를 갱신하는 중이에요."
                    : language === "en"
                      ? "The candidate comparison is being updated."
                      : "候補間の比較資料を更新中です。")}
              </p>
            </section>
            <section className="review-context">
              <h3>
                {language === "ko"
                  ? "다른 후보 지역과의 비교 근거"
                  : language === "en"
                    ? "Evidence from other candidate areas"
                    : "他の候補エリアとの比較根拠"}
              </h3>
              {current.peerComparison?.status === "distinct" && (
                <p className="review-context-text">
                  {current.peerComparison.texts[language]}
                </p>
              )}
              {current.peerComparison && (
                <p className="review-note">
                  {condition.label[language]} ·{" "}
                  {language === "ko"
                    ? `다른 후보 지역 ${current.peerComparison.expectedPeerAreas}곳`
                    : language === "en"
                      ? `${current.peerComparison.expectedPeerAreas} other candidate areas`
                      : `他の候補エリア ${current.peerComparison.expectedPeerAreas}区画`}{" "}
                  ·{" "}
                  {current.peerComparison.status === "distinct"
                    ? language === "ko"
                      ? "상대 특징 확인"
                      : language === "en"
                        ? "Relative feature supported"
                        : "相対的な特徴を確認"
                    : current.peerComparison.status === "no_supported_advantage"
                      ? language === "ko"
                        ? "앞세울 근거 없음"
                        : language === "en"
                          ? "No supported advantage"
                          : "優先する根拠なし"
                      : current.peerComparison.status ===
                          "insufficient_evidence"
                        ? language === "ko"
                          ? "자료 부족"
                          : language === "en"
                            ? "Insufficient evidence"
                            : "資料不足"
                        : language === "ko"
                          ? "기록된 추천 목록에 없음"
                          : language === "en"
                            ? "Not in recorded results"
                            : "記録された候補に該当なし"}
                </p>
              )}
              <small>
                {data.sourceYear} · {t.collected} ·{" "}
                {language === "ko"
                  ? "내국인 20·30대 / 주변 지역"
                  : language === "ja"
                    ? "韓国内国人20〜30代 / 周辺地域"
                    : "Domestic population in their 20s–30s / surrounding area"}
              </small>
              <p className="review-note">{t.contextNote}</p>
            </section>
            {store.historicalPatterns && (
              <HistoricalPatternCard
                key={`${store.id}:${condition.id}`}
                patterns={store.historicalPatterns}
                language={language}
                month={Number(condition.date.slice(5, 7))}
                day={weekdayGroup(condition.date) as PatternDay["dayGroup"]}
              />
            )}
            <details className="review-provenance">
              <summary>{t.source}</summary>
              <dl className="review-details">
                <dt>{t.observed}</dt>
                <dd>
                  {current.snapshot.rank} / {current.snapshot.checkedCount} ·{" "}
                  {current.snapshot.pages.length} pages
                </dd>
                <dt>API</dt>
                <dd>
                  {condition.date} · {condition.slot} · {condition.density}
                </dd>
                <dt>Observed</dt>
                <dd>{current.snapshot.receivedAt}</dd>
                <dt>Full scan</dt>
                <dd>{String(current.snapshot.complete)}</dd>
                <dt>Engine full-order match</dt>
                <dd>{String(current.engineExactOrderMatch)}</dd>
              </dl>
              {current.context && (
                <p className="review-mono">
                  {current.context.evidenceId}
                  <br />
                  {current.context.subjectRef}
                </p>
              )}
              <p className="review-note">
                {language === "ko"
                  ? "주변 설명은 사후에 붙인 참고 정보입니다. 추천 점수에 대한 기여도를 의미하지 않습니다."
                  : language === "ja"
                    ? "周辺の説明は追加の参考情報です。おすすめスコアへの寄与を示しません。"
                    : "Area context is added after selection and does not establish its contribution to the recommendation score."}
              </p>
            </details>
            <div className="review-live">
              <button
                className="review-secondary"
                onClick={() => setRetry((v) => v + 1)}
              >
                {t.refresh}
              </button>
              <p role="status">
                {activeLive?.data
                  ? activeLive.data.status === "confirmed"
                    ? `${t.confirmed} · #${activeLive.data.rank}`
                    : t.notSeen
                  : activeLive?.error
                    ? `${t.unavailable} (${activeLive.error})`
                    : t.checking}
              </p>
            </div>
            <section className="review-google">
              <h2>{t.google}</h2>
              <p className="review-note">{t.googleNote}</p>
              {activeGoogle?.data ? (
                <GoogleDetails data={activeGoogle.data} language={language} />
              ) : (
                <>
                  <button
                    className="review-primary"
                    disabled={activeGoogle?.loading}
                    onClick={loadGoogle}
                  >
                    {activeGoogle?.loading ? t.checking : t.loadGoogle}
                  </button>
                  {activeGoogle?.error && (
                    <p role="status">
                      {t.unavailable} ({activeGoogle.error})
                    </p>
                  )}
                </>
              )}
            </section>
          </article>
          <aside className="review-aside">
            <section className="review-feedback">
              <p className="review-eyebrow">YOUR REVIEW</p>
              <h2>{t.vote}</h2>
              <div className="review-rating">
                {(
                  [
                    ["helpful", t.good],
                    ["weak", t.weak],
                    ["misleading", t.misleading],
                  ] as const
                ).map(([rating, label]) => (
                  <button
                    key={rating}
                    aria-pressed={answer.rating === rating}
                    onClick={() => updateFeedback({ rating })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="review-note-label">
                {t.note}
                <textarea
                  maxLength={500}
                  rows={4}
                  value={answer.note}
                  onChange={(e) => updateFeedback({ note: e.target.value })}
                />
              </label>
              <button
                className="review-primary"
                disabled={!answer.rating}
                onClick={saveFeedback}
              >
                {t.save}
              </button>
              <p role="status">{saved}</p>
              <div className="review-shared">
                <b>{t.totalVotes}</b>
                <span>
                  {t.good}: {summary.helpful ?? 0}
                </span>
                <span>
                  {t.weak}: {summary.weak ?? 0}
                </span>
                <span>
                  {t.misleading}: {summary.misleading ?? 0}
                </span>
              </div>
              <button className="review-text-button" onClick={downloadFeedback}>
                {t.export} ↓
              </button>
            </section>
            <section className="review-top">
              <h2>{t.top}</h2>
              <p className="review-note">{t.order}</p>
              <ol>
                {top.map((item) => (
                  <li key={item.id}>
                    <span>{item.name}</span>
                    {item.id === store.id && <b>←</b>}
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
        <section className="review-overview">
          <div className="review-section-line">
            <h2>{t.overview}</h2>
            <span>{t.observed}</span>
          </div>
          <div className="review-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.condition}</th>
                  <th>{t.position}</th>
                  <th>{t.characteristics}</th>
                </tr>
              </thead>
              <tbody>
                {data.conditions.map((c) => {
                  const item = store.cases.find((r) => r.conditionId === c.id)!;
                  return (
                    <tr key={c.id} data-active={c.id === condition.id}>
                      <th>
                        <button onClick={() => setConditionId(c.id)}>
                          {c.label[language]}
                        </button>
                        <small>{c.date}</small>
                      </th>
                      <td>
                        #{item.snapshot.rank ?? "—"}
                        <small>/ {item.snapshot.checkedCount}</small>
                      </td>
                      <td>
                        {item.peerComparison?.texts[language] ?? t.missing}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <footer className="review-footer">
          LOCAL · {data.sourceYear} historical population context ·{" "}
          <time dateTime={data.generatedAt}>
            {new Date(data.generatedAt).toLocaleString(language)}
          </time>
        </footer>
      </div>
    </main>
  );
}
