import { useEffect, useState } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { localText } from "../localization";
import type { DiscoveryLanguage } from "../model";

/** Show the sourced summary or request one for a place with a permit record. */
export function PlaceAiSummary({
  id,
  sinceDate,
  editorialSummary,
  language,
}: {
  id: string;
  sinceDate?: string;
  editorialSummary?: string;
  language: DiscoveryLanguage;
}) {
  const [response, setResponse] = useState<{ key: string; summary: string }>();
  const enabled = Boolean(sinceDate) && !editorialSummary;
  const key = new URLSearchParams({ id, lang: language }).toString();
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(`/api/place-summary?${key}`, { signal: controller.signal })
      .then(async (response) => {
        const payload =
          response.status === 200
            ? ((await response.json()) as { summary: string })
            : undefined;
        if (!controller.signal.aborted)
          setResponse({ key, summary: payload?.summary ?? "" });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResponse({ key, summary: "" });
      });
    return () => controller.abort();
  }, [enabled, key]);
  const summary =
    editorialSummary || (response?.key === key ? response.summary : "");
  const pending = enabled && response?.key !== key;
  if (!summary && !pending) return null;
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
          <p>{summary}</p>
          <small className="local-place-ai-note">
            {t("Generated with Gemini", "Gemini로 자동 생성")}
            {!editorialSummary && ` · ${t("Business permits", "인허가 이력")}`}
          </small>
        </>
      ) : (
        <>
          <div className="local-place-ai-placeholder" aria-hidden="true">
            <span className="local-skeleton" />
            <span className="local-skeleton" />
          </div>
          <small className="local-place-ai-note" role="status">
            {t("Gemini is writing the summary…", "Gemini가 요약하는 중…")}
          </small>
        </>
      )}
    </section>
  );
}
