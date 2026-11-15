"use client";
import { useState } from "react";
import type { HistoricalPatterns, PatternDay, ReviewLanguage } from "./types";

const DAYS = {
  ko: { MON_THU: "월~목요일", FRI: "금요일", SAT: "토요일", SUN: "일요일" },
  en: {
    MON_THU: "Monday–Thursday",
    FRI: "Friday",
    SAT: "Saturday",
    SUN: "Sunday",
  },
  ja: { MON_THU: "月〜木曜日", FRI: "金曜日", SAT: "土曜日", SUN: "日曜日" },
};
const SLOTS = {
  ko: { LUNCH: "점심", AFTERNOON: "오후", DINNER: "저녁", LATE_NIGHT: "심야" },
  en: {
    LUNCH: "Lunch",
    AFTERNOON: "Afternoon",
    DINNER: "Dinner",
    LATE_NIGHT: "Late night",
  },
  ja: { LUNCH: "昼食", AFTERNOON: "午後", DINNER: "夕食", LATE_NIGHT: "深夜" },
};
const HOURS = {
  LUNCH: "11–13",
  AFTERNOON: "14–17",
  DINNER: "18–21",
  LATE_NIGHT: "22–01",
};

/** Four historical area windows; no invented hourly restaurant popularity. */
export function HistoricalPatternCard({
  patterns,
  language,
  month: initialMonth,
  day: initialDay,
}: {
  patterns: HistoricalPatterns;
  language: ReviewLanguage;
  month: number;
  day: PatternDay["dayGroup"];
}) {
  const [month, setMonth] = useState(
    patterns.months.some((m) => m.month === initialMonth)
      ? initialMonth
      : patterns.months[0].month,
  );
  const [day, setDay] = useState(initialDay);
  const period = patterns.months.find((m) => m.month === month)!;
  const pattern = period.days.find((d) => d.dayGroup === day)!;
  const names = pattern.peakSlots.map((s) => SLOTS[language][s]).join(" · ");
  const title =
    language === "ko"
      ? "이 매장 주변의 과거 시간 패턴"
      : language === "en"
        ? "Past time patterns around this restaurant"
        : "この店舗周辺の過去の時間パターン";
  const missing =
    language === "ko"
      ? "네 시간대의 자료가 모두 확인되지 않아 그래프를 생략했어요."
      : language === "en"
        ? "The chart is omitted because all four windows were not observed."
        : "4つの時間帯すべての資料を確認できないため、グラフを省略しています。";
  const low =
    language === "ko"
      ? "관측 지표가 적어 높은 시간대를 단정하지 않았어요."
      : language === "en"
        ? "The observed indicators are too low to identify a peak window."
        : "観測指標が少ないため、高い時間帯を断定していません。";
  const sentence =
    pattern.status !== "available"
      ? pattern.status === "incomplete"
        ? missing
        : low
      : pattern.peakSlots.length === 4
        ? language === "ko"
          ? "네 시간대의 지표가 비슷한 편이었어요."
          : language === "en"
            ? "The indicators were relatively similar across all four windows."
            : "4つの時間帯の指標は比較的近い値でした。"
        : language === "ko"
          ? `${DAYS.ko[day]}에는 ${names}의 주변 방문 지표가 ${pattern.peakSlots.length === 1 ? "가장" : "상대적으로"} 높았어요.`
          : language === "en"
            ? `On ${DAYS.en[day]}, the area's visitation indicator was ${pattern.peakSlots.length === 1 ? "highest" : "relatively high"} at ${names.toLowerCase()}.`
            : `${DAYS.ja[day]}は、周辺の訪問指標が${names}に${pattern.peakSlots.length === 1 ? "最も" : "比較的"}高い傾向でした。`;
  return (
    <section className="review-pattern" aria-label={title}>
      <div className="review-section-line">
        <h3>{title}</h3>
        <span>{patterns.sourceYear}</span>
      </div>
      <div className="review-pattern-selectors">
        <label>
          {language === "ko" ? "월" : language === "en" ? "Month" : "月"}
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {patterns.months.map((m) => (
              <option key={m.month} value={m.month}>
                {language === "en"
                  ? new Intl.DateTimeFormat("en", {
                      month: "short",
                      timeZone: "UTC",
                    }).format(Date.UTC(patterns.sourceYear, m.month - 1, 1))
                  : `${m.month}${language === "ko" ? "월" : "月"}`}
              </option>
            ))}
          </select>
        </label>
        <label>
          {language === "ko"
            ? "요일 묶음"
            : language === "en"
              ? "Weekday group"
              : "曜日区分"}
          <select
            value={day}
            onChange={(e) => setDay(e.target.value as PatternDay["dayGroup"])}
          >
            {Object.entries(DAYS[language]).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {period.representativePeak && (
        <div className="review-pattern-peak">
          <small>
            {language === "ko"
              ? "그달 관측 구간 중 가장 높았던 때"
              : language === "en"
                ? "Highest observed window that month"
                : "その月の観測区分で最も高かった時間帯"}
          </small>
          <strong>
            {DAYS[language][period.representativePeak.dayGroup]} ·{" "}
            {SLOTS[language][period.representativePeak.slot]}{" "}
            <span>{HOURS[period.representativePeak.slot]}</span>
          </strong>
        </div>
      )}
      <p className="review-pattern-headline">{sentence}</p>
      {pattern.status === "available" && pattern.bars && (
        <figure
          className="review-pattern-chart"
          role="img"
          aria-label={`${title}. ${sentence}`}
        >
          {patterns.slots.map((slot, i) => (
            <div className="review-pattern-column" key={slot}>
              <div className="review-pattern-track">
                <span
                  className={pattern.peakSlots.includes(slot) ? "peak" : ""}
                  style={{ height: `${pattern.bars![i]}%` }}
                />
              </div>
              <b>{SLOTS[language][slot]}</b>
              <small>{HOURS[slot]}</small>
            </div>
          ))}
        </figure>
      )}
      <p className="review-note">
        {language === "ko"
          ? "주변 지역 · 내국인 20·30대 · 하루 최댓값 기준 상대 크기. 같은 지역의 매장은 패턴을 공유해요."
          : language === "en"
            ? "Surrounding area · domestic population in their 20s–30s · scaled to each day’s maximum. Restaurants in the same grid share this pattern."
            : "周辺エリア・韓国内国人20〜30代・その日の最大値を基準にした相対的な大きさ。同じ区画の店舗は同じパターンです。"}
      </p>
    </section>
  );
}
