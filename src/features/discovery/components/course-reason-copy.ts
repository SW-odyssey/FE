import type { CourseReason } from "../data/course-api.ts";
import { localText } from "../localization.ts";
import type { DiscoveryLanguage } from "../model.ts";

export function courseReasonText(
  reason: CourseReason,
  language: DiscoveryLanguage,
) {
  const t = (en: string, ko: string) => localText(language, en, ko);
  switch (reason.code) {
    case "LOCAL_TOP":
      return t(
        "Nearby 50 m area ranks in the top {n}% for visits at this time",
        "이 시간대 주변 50m 구역 방문량 상위 {n}%",
      ).replace("{n}", String(reason.percent));
    case "OPEN_DURING_STAY":
      return `${reason.from}–${reason.to} ${t("within business hours", "영업시간 내")}`;
    case "PEAK_NOW":
      return t(
        "The busiest time for this area",
        "이 구역의 방문이 가장 많은 시간대",
      );
    case "AREA_TYPE":
      switch (reason.type) {
        case "late_night":
          return t("Area busiest at night", "밤에 붐비는 동네");
        case "weekend_day":
          return t("Area busiest on weekend days", "주말 낮에 붐비는 동네");
        case "weekday_day":
          return t("Area busiest on weekday days", "평일 낮에 붐비는 동네");
        case "mixed":
          return t("Area busy across different times", "고르게 붐비는 동네");
      }
      break;
    case "SIMILAR_CHOICES":
      return t(
        "One of {n} similarly scored places",
        "비슷한 점수의 후보 {n}곳 중 하나",
      ).replace("{n}", String(reason.count));
  }
  return "";
}
