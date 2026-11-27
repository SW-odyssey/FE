import { useEffect, useId, useState } from "react";
import type { AreaVisitPattern, VisitDayGroup } from "../data/types";
import type { DiscoveryLanguage } from "../model";
import { dateLocales, localText } from "../localization";
import { getLiveVisitPattern } from "../data/visit-pattern";
import type { ApiWeekday } from "../data/v2-client";
import { formatReferenceMonth, slotLabels } from "../presentation";
import { visitSlots } from "../visit-time";

const dayGroupByWeekday: readonly VisitDayGroup[] = [
  "sun",
  "monThu",
  "monThu",
  "monThu",
  "monThu",
  "fri",
  "sat",
];
const dayGroups: VisitDayGroup[] = ["monThu", "fri", "sat", "sun"];
const weekdays: ApiWeekday[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];
const copy = {
  ko: {
    title: "주변 방문 패턴",
    dayLabel: "방문 패턴 요일",
    missing: "자료 없음",
    loading: "방문 패턴을 불러오는 중…",
    unavailable: "이 요일의 방문 패턴 자료가 없어요.",
    days: { monThu: "월~목", fri: "금요일", sat: "토요일", sun: "일요일" },
  },
  en: {
    title: "Nearby visit patterns",
    dayLabel: "Day for visit patterns",
    missing: "No data",
    loading: "Loading visit patterns…",
    unavailable: "Visit pattern data is unavailable for this day.",
    days: { monThu: "Mon–Thu", fri: "Friday", sat: "Saturday", sun: "Sunday" },
  },
  ja: {
    title: "周辺の来訪傾向",
    dayLabel: "来訪傾向の曜日",
    missing: "データなし",
    loading: "来訪傾向を読み込み中…",
    unavailable: "この曜日の来訪データはありません。",
    days: { monThu: "月〜木", fri: "金曜日", sat: "土曜日", sun: "日曜日" },
  },
  zh: {
    title: "周边到访趋势",
    dayLabel: "到访趋势的星期",
    missing: "暂无数据",
    loading: "正在加载到访趋势…",
    unavailable: "当天暂无到访趋势数据。",
    days: { monThu: "周一至周四", fri: "周五", sat: "周六", sun: "周日" },
  },
};

/**
 * @param props Area indicators, the applied Seoul visit date, and display language.
 * @returns A time-slot chart initialized to the applied visit day's weekday group.
 */
export function AreaVisitPatternCard({
  pattern,
  visitDate,
  language,
}: {
  pattern: AreaVisitPattern;
  visitDate: string;
  language: DiscoveryLanguage;
}) {
  const titleId = useId();
  const [day, setDay] = useState(
    () => dayGroupByWeekday[new Date(`${visitDate}T00:00:00Z`).getUTCDay()],
  );
  const live = pattern.provenance === "live" ? pattern : undefined;
  const [weekday, setWeekday] = useState(() => live?.weekday ?? "mon");
  const [result, setResult] = useState<{
    key: string;
    data: Awaited<ReturnType<typeof getLiveVisitPattern>>;
  }>();
  const cellId = live?.cellId;
  const datasetId = live?.datasetId;
  const key = `${datasetId}/${cellId}/${weekday}`;
  useEffect(() => {
    if (!cellId || !datasetId) return;
    const controller = new AbortController();
    getLiveVisitPattern({ datasetId, cellId, weekday }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key, data: null });
      });
    return () => controller.abort();
  }, [cellId, datasetId, key, weekday]);
  const current = result?.key === key ? result : undefined;
  const graph = current?.data;
  const pending = Boolean(live && !current);
  const preview =
    pattern.provenance === "preview" ? pattern.byDay[day] : undefined;
  const previewHeights = preview ? visitSlots.map((slot) => preview[slot]) : [];
  const previewHighest = Math.max(...previewHeights);
  if (
    preview &&
    (previewHeights.some(
      (value) => !Number.isFinite(value) || value < 0 || value > 100,
    ) ||
      previewHighest <= Math.min(...previewHeights))
  )
    return null;
  const heights = live ? graph?.heights : preview;
  const labels = copy[language];
  const weekdayLabel = new Intl.DateTimeFormat(dateLocales[language], {
    weekday: "long",
    timeZone: "UTC",
  });

  return (
    <section
      className="local-detail-section local-visit-pattern"
      aria-labelledby={titleId}
      aria-busy={pending}
    >
      <div className="local-visit-pattern-heading">
        <h2 id={titleId}>
          {labels.title}
          {pattern.provenance === "preview" && (
            <small className="local-place-ai-note">
              {" "}
              · {localText(language, "Sample data", "예시 데이터")}
            </small>
          )}
        </h2>
        <label className="local-visit-pattern-day">
          <span className="local-sr-only">{labels.dayLabel}</span>
          <select
            value={live ? weekday : day}
            onChange={(event) => {
              if (live) {
                const nextWeekday = event.currentTarget.value as ApiWeekday;
                if (nextWeekday === weekday) return;
                setResult(undefined);
                setWeekday(nextWeekday);
              } else {
                setDay(event.currentTarget.value as VisitDayGroup);
              }
            }}
          >
            {live
              ? weekdays.map((day, index) => (
                  <option key={day} value={day}>
                    {weekdayLabel.format(Date.UTC(2024, 0, index + 1))}
                  </option>
                ))
              : dayGroups.map((group) => (
                  <option key={group} value={group}>
                    {labels.days[group]}
                  </option>
                ))}
          </select>
        </label>
      </div>
      {heights ? (
        <ul
          className="local-visit-pattern-chart"
          role="list"
          aria-label={
            (live &&
              localText(
                language,
                "LG U+ · Relative visits by time of day in the surrounding 50 m cell",
                "LG U+ · 주변 50m 구역의 시간대별 상대 방문 지표",
              )) ||
            undefined
          }
        >
          {visitSlots.map((slot) => {
            const height = heights[slot];
            const peak = live
              ? graph?.highlightSlot === slot
              : height === previewHighest;
            return (
              <li key={slot} data-peak={peak}>
                <div
                  className={`local-visit-pattern-track${height === null ? " is-missing" : ""}`}
                  aria-hidden="true"
                >
                  {height === null ? (
                    <small>{labels.missing}</small>
                  ) : (
                    <span style={{ height: `${height}%` }} />
                  )}
                </div>
                <span>{slotLabels[language][slot]}</span>
                <span className="local-sr-only">
                  {height === null ? labels.missing : `${height} / 100`}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="local-visit-pattern-message" role="status">
          {pending ? labels.loading : labels.unavailable}
        </p>
      )}
      {live?.referenceMonth && (
        <p className="local-data-month">
          {formatReferenceMonth(live.referenceMonth, language)}
        </p>
      )}
    </section>
  );
}
