import { useEffect, useState } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { PlaceSummary } from "../data/place-summary";
import { localText } from "../localization";
import type { DiscoveryLanguage } from "../model";

/** Show the curated summary or request Google Maps context for this visit. */
export function PlaceAiSummary({
  id,
  googlePlaceId,
  curatedSummary,
  language,
}: {
  id: string;
  googlePlaceId?: string;
  curatedSummary?: string;
  language: DiscoveryLanguage;
}) {
  const [response, setResponse] = useState<{
    key: string;
    result: PlaceSummary | null;
  }>();
  const livePlace = /^\d+$/.test(id);
  const enabled = livePlace && Boolean(googlePlaceId) && !curatedSummary;
  const key = new URLSearchParams({ id, lang: language }).toString();
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(`/api/place-summary?${key}`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload =
          response.status === 200
            ? ((await response.json()) as PlaceSummary)
            : null;
        if (!controller.signal.aborted) setResponse({ key, result: payload });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResponse({ key, result: null });
      });
    return () => controller.abort();
  }, [enabled, key]);
  const grounded = response?.key === key ? response.result : null;
  const summary = curatedSummary || grounded?.summary;
  const pending = enabled && response?.key !== key;
  if (!livePlace && !summary) return null;
  const t = (en: string, ko: string) => localText(language, en, ko);
  return (
    <section className="local-detail-section local-place-ai">
      <div className="local-place-ai-heading">
        <span className="local-place-ai-icon" aria-hidden="true">
          <LocalIcon name="sparkles" size={17} />
        </span>
        <h2>{t("AI place summary", "AI 매장 요약")}</h2>
      </div>
      {summary ? (
        <>
          <p
            className={
              grounded && !curatedSummary
                ? "local-place-grounded-text"
                : undefined
            }
          >
            {summary}
          </p>
          <footer className="local-place-ai-credits">
            {grounded && !curatedSummary && grounded.sources.length > 0 && (
              <div className="local-place-source local-place-grounded-sources">
                <span translate="no">Google Maps</span>
                <ul>
                  {grounded.sources.map(({ name, url }) => (
                    <li key={JSON.stringify([name, url])}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        translate="no"
                      >
                        {name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <small className="local-place-ai-note">
              {t("Generated with Gemini", "Gemini로 자동 생성")}
            </small>
          </footer>
        </>
      ) : pending ? (
        <div className="local-place-ai-loading">
          <div className="local-place-ai-skeleton" aria-hidden="true">
            <span className="local-skeleton" />
            <span className="local-skeleton" />
          </div>
          <small className="local-place-ai-note" role="status">
            {t(
              "Gemini is checking this place…",
              "Gemini가 매장 정보를 확인하는 중…",
            )}
          </small>
        </div>
      ) : (
        <p className="local-place-ai-unavailable" role="status">
          {t("AI summary is unavailable.", "AI 요약 정보가 없어요.")}
        </p>
      )}
    </section>
  );
}
