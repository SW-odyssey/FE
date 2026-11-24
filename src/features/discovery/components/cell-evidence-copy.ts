import type { CellReasonCode } from "../data/types";
import type { DiscoveryLanguage } from "../model";

const reasons: Record<
  CellReasonCode,
  readonly [string, string, string, string]
> = {
  VISIT_RELATIVE_HIGH: [
    "Relatively high visits for this month, weekday and time slot",
    "같은 기준 월·요일·시간대의 비교 구역보다 방문 수준이 높아요.",
    "同じ基準月・曜日・時間帯の比較区画より訪問水準が高めです。",
    "与同一基准月、星期和时段的对照网格相比，访问水平较高。",
  ],
  DAY_DISTINCT: [
    "Distinctive visits compared with other Monday–Thursday weekdays",
    "월~목의 다른 요일 같은 시간대와 비교해 이 요일의 방문 특성이 두드러져요.",
    "月曜から木曜の別の曜日の同じ時間帯と比べ、訪問の特徴があります。",
    "与周一至周四其他日期的相同时段相比，这一天的访问特征较明显。",
  ],
  STAY_DISTINCT: [
    "Distinctive stays compared with areas of similar visit rank",
    "방문 순위가 비슷한 구역과 비교해 체류 특성이 두드러져요.",
    "訪問順位が近い区画と比べ、滞在の特徴があります。",
    "与访问排名相近的网格相比，停留特征较明显。",
  ],
  WALK_DISTINCT: [
    "Distinctive walking activity compared with areas of similar visit rank",
    "방문 순위가 비슷한 구역과 비교해 보행 특성이 두드러져요.",
    "訪問順位が近い区画と比べ、歩行の特徴があります。",
    "与访问排名相近的网格相比，步行特征较明显。",
  ],
  AGE20_DISTINCT: [
    "Visitors in their 20s stand out within the 20–39 analysis group",
    "20·30대 비교에서 20대 방문 특성이 두드러져요.",
    "20～39歳の比較で20代の訪問が目立ちます。",
    "在 20–39 岁的比较中，20 多岁人群的访问特征较明显。",
  ],
  AGE30_DISTINCT: [
    "Visitors in their 30s stand out within the 20–39 analysis group",
    "20·30대 비교에서 30대 방문 특성이 두드러져요.",
    "20～39歳の比較で30代の訪問が目立ちます。",
    "在 20–39 岁的比较中，30 多岁人群的访问特征较明显。",
  ],
  TIME_PEAK: [
    "Visits stand out at this time compared with other times on the same weekday",
    "같은 요일의 다른 시간대보다 이 시간대의 방문 특성이 두드러져요.",
    "同じ曜日の別の時間帯と比べ、この時間帯の訪問が目立ちます。",
    "与同一天的其他时段相比，这个时段的访问特征较明显。",
  ],
};

/** Read the localized text for evidence about the 50 m cell. */
export function cellEvidenceText(
  language: DiscoveryLanguage,
  code: CellReasonCode,
) {
  return reasons[code]?.[({ en: 0, ko: 1, ja: 2, zh: 3 } as const)[language]];
}
