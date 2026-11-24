import { useId, useState } from "react";
import type { AreaVisitPattern, VisitDayGroup } from "../data/types";
import type { DiscoveryLanguage } from "../model";
import { localText } from "../localization";
import { slotLabels } from "../presentation";
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
  const values = pattern.byDay[day];
  const heights = visitSlots.map((slot) => values[slot]);
  const highest = Math.max(...heights);
  const hasPeak =
    heights.every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 100,
    ) && highest > Math.min(...heights);
  const labels = copy[language];

  return (
    <section
      className="local-detail-section local-visit-pattern"
      aria-labelledby={titleId}
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
            value={day}
            onChange={(event) =>
              setDay(event.currentTarget.value as VisitDayGroup)
            }
          >
            {dayGroups.map((group) => (
              <option key={group} value={group}>
                {labels.days[group]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hasPeak && (
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
    </section>
  );
}
