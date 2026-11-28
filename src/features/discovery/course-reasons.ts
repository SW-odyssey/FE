import type { DiscoveryLanguage } from "./model.ts";

/**
 * Why the course picked a stop (BE `CourseReason`, #78). The server sends the
 * code and its values in a fixed order; the FE writes the sentence.
 */
export type CourseReason =
  | { code: "LOCAL_TOP"; percent: number }
  | { code: "OPEN_DURING_STAY"; from: string; to: string }
  | { code: "PEAK_NOW" }
  | {
      code: "AREA_TYPE";
      type: "late_night" | "weekend_day" | "weekday_day" | "mixed";
    }
  | { code: "SIMILAR_CHOICES"; count: number };

const areaTypes = new Set([
  "late_night",
  "weekend_day",
  "weekday_day",
  "mixed",
]);
const clock = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * @param value `stops[].reasons` from GET /api/v2/course-recommendations
 * @returns Known reasons in server order. Unknown codes and invalid values are
 * dropped, so a new or malformed code never becomes an empty or wrong line.
 */
export function parseCourseReasons(value: unknown): CourseReason[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): CourseReason[] => {
    if (!item || typeof item !== "object") return [];
    const reason = item as Record<string, unknown>;
    switch (reason.code) {
      case "LOCAL_TOP":
        return Number.isInteger(reason.percent) &&
          (reason.percent as number) >= 1 &&
          (reason.percent as number) <= 100
          ? [{ code: "LOCAL_TOP", percent: reason.percent as number }]
          : [];
      case "OPEN_DURING_STAY":
        return typeof reason.from === "string" &&
          typeof reason.to === "string" &&
          clock.test(reason.from) &&
          clock.test(reason.to)
          ? [{ code: "OPEN_DURING_STAY", from: reason.from, to: reason.to }]
          : [];
      case "PEAK_NOW":
        return [{ code: "PEAK_NOW" }];
      case "AREA_TYPE":
        return typeof reason.type === "string" && areaTypes.has(reason.type)
          ? [
              {
                code: "AREA_TYPE",
                type: reason.type as Extract<
                  CourseReason,
                  { code: "AREA_TYPE" }
                >["type"],
              },
            ]
          : [];
      case "SIMILAR_CHOICES":
        return Number.isInteger(reason.count) && (reason.count as number) >= 2
          ? [{ code: "SIMILAR_CHOICES", count: reason.count as number }]
          : [];
      default:
        return [];
    }
  });
}

type Copy = Record<DiscoveryLanguage, string>;
const areaCopy: Record<
  Extract<CourseReason, { code: "AREA_TYPE" }>["type"],
  Copy
> = {
  late_night: {
    en: "Area busiest at night",
    ko: "밤에 붐비는 동네",
    ja: "夜ににぎわうエリア",
    zh: "夜间热闹的街区",
  },
  weekend_day: {
    en: "Area busiest on weekend days",
    ko: "주말 낮에 붐비는 동네",
    ja: "週末の昼ににぎわうエリア",
    zh: "周末白天热闹的街区",
  },
  weekday_day: {
    en: "Area busiest on weekday days",
    ko: "평일 낮에 붐비는 동네",
    ja: "平日の昼ににぎわうエリア",
    zh: "工作日白天热闹的街区",
  },
  mixed: {
    en: "Area busy at many times",
    ko: "여러 시간대에 고르게 붐비는 동네",
    ja: "時間帯を問わずにぎわうエリア",
    zh: "各时段都热闹的街区",
  },
};

/**
 * @param reason A parsed reason
 * @param language UI language
 * @returns One short line. LOCAL_TOP describes the 50 m cell in the stop's
 * slot (shown on the card), not the store itself.
 */
export function courseReasonText(
  reason: CourseReason,
  language: DiscoveryLanguage,
): string {
  switch (reason.code) {
    case "LOCAL_TOP": {
      const n = reason.percent;
      return {
        en: `Top ${n}% for visits within 50 m`,
        ko: `주변 50m 방문 상위 ${n}%`,
        ja: `周辺50mの来訪上位${n}%`,
        zh: `周边50米到访量前${n}%`,
      }[language];
    }
    case "OPEN_DURING_STAY": {
      const range = `${reason.from}–${reason.to}`;
      return {
        en: `Open ${range} during your stay`,
        ko: `${range} 영업시간 안`,
        ja: `${range}は営業時間内`,
        zh: `${range}在营业时间内`,
      }[language];
    }
    case "PEAK_NOW":
      return {
        en: "This block's busiest time that day",
        ko: "이 요일 이 구역이 가장 붐비는 시간",
        ja: "この曜日にこの区域が最も混む時間",
        zh: "该区域当天最热闹的时段",
      }[language];
    case "AREA_TYPE":
      return areaCopy[reason.type][language];
    case "SIMILAR_CHOICES": {
      const n = reason.count;
      return {
        en: `Picked from ${n} similar places`,
        ko: `비슷한 후보 ${n}곳 중 선택`,
        ja: `似た候補${n}件から選択`,
        zh: `从${n}个相近候选中选出`,
      }[language];
    }
  }
}

/** The BE orders reasons by importance; the course card shows this many. */
export const shownCourseReasons = 2;
