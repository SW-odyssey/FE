"use client";
import { useState } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import { dateLocales } from "../localization";
import type { DiscoveryLanguage } from "../model";
import { discoveryCopy } from "../recommendation-analysis";
import { adjacentMonth, visitCalendar } from "../visit-calendar";
import { visitDate } from "../visit-date";

export function VisitCalendar({
  clock,
  day,
  language,
  onChange,
}: {
  clock: Date;
  day: number;
  language: DiscoveryLanguage;
  onChange: (day: number) => void;
}) {
  const selected = visitDate(clock, day);
  const [month, setMonth] = useState(selected.slice(0, 7));
  const copy = discoveryCopy[language];
  const locale = dateLocales[language];
  const minMonth = visitDate(clock, 0).slice(0, 7);
  const maxMonth = visitDate(clock, 6).slice(0, 7);
  const shown =
    month < minMonth || month > maxMonth ? selected.slice(0, 7) : month;
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  return (
    <section className="local-calendar" aria-label={copy.calendar}>
      <div className="local-calendar-heading">
        <strong aria-live="polite">
          {formatter.format(new Date(`${shown}-01T00:00:00Z`))}
        </strong>
        <div>
          <button
            aria-label={copy.previousMonth}
            disabled={shown <= minMonth}
            onClick={() => setMonth(adjacentMonth(shown, -1))}
          >
            <LocalIcon name="chevron-left" size={18} />
          </button>
          <button
            aria-label={copy.nextMonth}
            disabled={shown >= maxMonth}
            onClick={() => setMonth(adjacentMonth(shown, 1))}
          >
            <LocalIcon name="chevron-right" size={18} />
          </button>
        </div>
      </div>
      <div className="local-calendar-weekdays" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i}>
            {weekday.format(new Date(Date.UTC(2026, 10, 1 + i)))}
          </span>
        ))}
      </div>
      <div className="local-calendar-grid">
        {visitCalendar(clock, shown).map((cell, i) =>
          cell ? (
            <button
              key={cell.date}
              disabled={!cell.enabled}
              aria-pressed={cell.date === selected}
              aria-current={
                cell.date === visitDate(clock, 0) ? "date" : undefined
              }
              aria-label={new Intl.DateTimeFormat(locale, {
                dateStyle: "full",
                timeZone: "UTC",
              }).format(new Date(`${cell.date}T00:00:00Z`))}
              onClick={() => onChange(cell.offset)}
            >
              <span>{cell.day}</span>
            </button>
          ) : (
            <span key={`blank-${i}`} />
          ),
        )}
      </div>
    </section>
  );
}
