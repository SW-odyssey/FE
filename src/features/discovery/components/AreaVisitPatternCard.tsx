import { useEffect, useId, useState } from "react";
import type {
  AreaVisitPattern,
  CellReasonCode,
  VisitDayGroup,
} from "../data/types";
import type { DiscoveryLanguage } from "../model";
import { dateLocales, localText } from "../localization";
import { getLiveVisitPattern } from "../data/visit-pattern";
import type { ApiWeekday } from "../data/v2-client";
import { slotLabels } from "../presentation";
import { cellEvidenceText } from "./cell-evidence-copy";
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
    days: { monThu: "월~목", fri: "금요일", sat: "토요일", sun: "일요일" },
  },
  en: {
    title: "Nearby visit patterns",
    dayLabel: "Day for visit patterns",
    days: { monThu: "Mon–Thu", fri: "Friday", sat: "Saturday", sun: "Sunday" },
  },
  ja: {
    title: "周辺の来訪傾向",
    dayLabel: "来訪傾向の曜日",
    days: { monThu: "月〜木", fri: "金曜日", sat: "土曜日", sun: "日曜日" },
  },
  zh: {
    title: "周边到访趋势",
    dayLabel: "到访趋势的星期",
    days: { monThu: "周一至周四", fri: "周五", sat: "周六", sun: "周日" },
  },
};

/**
 * @param props Area indicators, the applied Seoul visit date, and display language.
 * @returns A time-slot chart initialized to the applied visit day's weekday group.
 */
export function AreaVisitPatternCard({
  pattern,
  reasons,
  visitDate,
  language,
}: {
  pattern?: AreaVisitPattern;
  reasons?: readonly CellReasonCode[];
  visitDate: string;
  language: DiscoveryLanguage;
}) {
  const titleId = useId();
  const [day, setDay] = useState(
    () => dayGroupByWeekday[new Date(`${visitDate}T00:00:00Z`).getUTCDay()],
  );
  const live = pattern?.provenance === "live" ? pattern : undefined;
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
        if (!controller.signal.aborted)
          setResult({ key, data: { status: "unavailable" } });
      });
    return () => controller.abort();
  }, [cellId, datasetId, key, weekday]);
  const liveData = result?.key === key ? result.data : undefined;
  const values =
    pattern?.provenance === "live"
      ? liveData?.status === "available"
        ? liveData.values
        : undefined
      : pattern?.byDay[day];
  const heights = values ? visitSlots.map((slot) => values[slot]) : [];
  const highest = Math.max(...heights);
  const hasPeak =
    heights.every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 100,
    ) && highest > Math.min(...heights);
  const labels = copy[language];
  const t = (en: string, ko: string) => localText(language, en, ko);
  const weekdayLabel = new Intl.DateTimeFormat(dateLocales[language], {
    weekday: "long",
    timeZone: "UTC",
  });

  return (
    <section
      className="local-detail-section local-visit-pattern"
      aria-labelledby={titleId}
    >
      <div className="local-visit-pattern-heading">
        <h2 id={titleId}>
          {labels.title}
          {pattern?.provenance === "preview" && (
            <small className="local-place-ai-note">
              {" "}
              · {localText(language, "Sample data", "예시 데이터")}
            </small>
          )}
        </h2>
        {pattern && (
          <label className="local-visit-pattern-day">
            <span className="local-sr-only">{labels.dayLabel}</span>
            <select
              value={live ? weekday : day}
              onChange={(event) => {
                if (live) setWeekday(event.currentTarget.value as ApiWeekday);
                else setDay(event.currentTarget.value as VisitDayGroup);
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
        )}
      </div>
      {values && hasPeak && (
        <ul className="local-visit-pattern-chart" role="list">
          {visitSlots.map((slot) => (
            <li key={slot} data-peak={hasPeak && values[slot] === highest}>
              <div className="local-visit-pattern-track" aria-hidden="true">
                <span style={{ height: `${values[slot]}%` }} />
              </div>
              <span>{slotLabels[language][slot]}</span>
              <span className="local-sr-only">{values[slot]} / 100</span>
            </li>
          ))}
        </ul>
      )}
      {live && (
        <>
          {!values && (
            <p role="status">
              {liveData?.status === "no-peak"
                ? t(
                    "No distinct peak time for this day.",
                    "이 요일은 뚜렷하게 붐비는 시간대가 없어요.",
                  )
                : liveData
                  ? t(
                      "Visit data is unavailable for this day.",
                      "이 요일의 방문 데이터를 표시할 수 없어요.",
                    )
                  : t(
                      "Loading visit patterns…",
                      "방문 패턴을 불러오는 중이에요.",
                    )}
            </p>
          )}
          <small className="local-place-ai-note">
            {t(
              "LG U+ · Relative visits by time of day in the surrounding 50 m cell",
              "LG U+ · 주변 50m 구역의 시간대별 상대 방문 지표",
            )}
          </small>
        </>
      )}
      {(!live || live.weekday === weekday) && reasons && reasons.length > 0 && (
        <ul className="local-visit-evidence">
          {reasons.map((reason) => {
            const text = cellEvidenceText(language, reason);
            return text && <li key={reason}>{text}</li>;
          })}
        </ul>
      )}
    </section>
  );
}
