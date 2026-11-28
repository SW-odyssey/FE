import type { DiscoveryLanguage } from "./model.ts";

/**
 * Why a 50 m cell is recommended (GET /api/v2/cells/reasons). The codes
 * describe the cell in the requested month, weekday and slot compared with
 * all cells, not the store itself.
 */
export type CellReasonCode =
  | "VISIT_RELATIVE_HIGH"
  | "DAY_DISTINCT"
  | "TIME_PEAK"
  | "STAY_DISTINCT"
  | "WALK_DISTINCT"
  | "AGE20_DISTINCT"
  | "AGE30_DISTINCT";

type Copy = Record<DiscoveryLanguage, string>;

/** A short chip for the list card and the full sentence for its tooltip. */
const copy: Record<CellReasonCode, { chip: Copy; full: Copy }> = {
  VISIT_RELATIVE_HIGH: {
    chip: {
      en: "More visits than most blocks",
      ko: "다른 구역보다 방문 많음",
      ja: "他の区画より来訪が多い",
      zh: "到访多于多数区域",
    },
    full: {
      en: "This 50 m block has more visits than most blocks in the same month, weekday and time slot.",
      ko: "같은 기준 월·요일·시간대의 다른 구역보다 이 50m 구역의 방문이 많아요.",
      ja: "同じ基準月・曜日・時間帯の他の区画より、この50m区画の来訪が多めです。",
      zh: "与同一基准月、星期和时段的其他区域相比，这个50米区域的到访较多。",
    },
  },
  DAY_DISTINCT: {
    chip: {
      en: "Stands out on this day",
      ko: "이 요일에 두드러짐",
      ja: "この曜日に目立つ",
      zh: "这一天较突出",
    },
    full: {
      en: "Visits in this block stand out on this day compared with other Monday–Thursday weekdays at the same time.",
      ko: "월~목의 다른 요일 같은 시간대와 비교해 이 요일의 방문 특성이 두드러져요.",
      ja: "月曜から木曜の別の曜日の同じ時間帯と比べ、この曜日の来訪に特徴があります。",
      zh: "与周一至周四其他日期的相同时段相比，这一天的到访特征较明显。",
    },
  },
  TIME_PEAK: {
    chip: {
      en: "Stands out at this time",
      ko: "이 시간대에 두드러짐",
      ja: "この時間帯に目立つ",
      zh: "这个时段较突出",
    },
    full: {
      en: "Visits in this block stand out at this time compared with other times on the same weekday.",
      ko: "같은 요일의 다른 시간대보다 이 시간대의 방문 특성이 두드러져요.",
      ja: "同じ曜日の別の時間帯と比べ、この時間帯の来訪が目立ちます。",
      zh: "与同一天的其他时段相比，这个时段的到访特征较明显。",
    },
  },
  STAY_DISTINCT: {
    chip: {
      en: "Distinct stays",
      ko: "체류 특성이 두드러짐",
      ja: "滞在の特徴が目立つ",
      zh: "停留特征突出",
    },
    full: {
      en: "Stays in this block are distinctive compared with blocks of similar visit rank.",
      ko: "방문 순위가 비슷한 구역과 비교해 체류 특성이 두드러져요.",
      ja: "来訪順位が近い区画と比べ、滞在に特徴があります。",
      zh: "与到访排名相近的区域相比，停留特征较明显。",
    },
  },
  WALK_DISTINCT: {
    chip: {
      en: "Distinct foot traffic",
      ko: "보행 특성이 두드러짐",
      ja: "歩行の特徴が目立つ",
      zh: "步行特征突出",
    },
    full: {
      en: "Walking activity in this block is distinctive compared with blocks of similar visit rank.",
      ko: "방문 순위가 비슷한 구역과 비교해 보행 특성이 두드러져요.",
      ja: "来訪順位が近い区画と比べ、歩行に特徴があります。",
      zh: "与到访排名相近的区域相比，步行特征较明显。",
    },
  },
  AGE20_DISTINCT: {
    chip: {
      en: "20s stand out among 20–39",
      ko: "20·30대 중 20대 두드러짐",
      ja: "20〜30代のうち20代が目立つ",
      zh: "20–39岁中20多岁突出",
    },
    full: {
      en: "Among visitors aged 20–39 in this block, those in their 20s stand out. This is not the store's customer age mix.",
      ko: "이 구역의 20·30대 방문 비교에서 20대가 두드러져요. 매장 손님의 연령 비율은 아니에요.",
      ja: "この区画の20〜39歳の来訪比較で20代が目立ちます。店舗の客層比率ではありません。",
      zh: "在该区域20–39岁到访者的比较中，20多岁人群较突出。这不是店铺顾客的年龄比例。",
    },
  },
  AGE30_DISTINCT: {
    chip: {
      en: "30s stand out among 20–39",
      ko: "20·30대 중 30대 두드러짐",
      ja: "20〜30代のうち30代が目立つ",
      zh: "20–39岁中30多岁突出",
    },
    full: {
      en: "Among visitors aged 20–39 in this block, those in their 30s stand out. This is not the store's customer age mix.",
      ko: "이 구역의 20·30대 방문 비교에서 30대가 두드러져요. 매장 손님의 연령 비율은 아니에요.",
      ja: "この区画の20〜39歳の来訪比較で30代が目立ちます。店舗の客層比率ではありません。",
      zh: "在该区域20–39岁到访者的比较中，30多岁人群较突出。这不是店铺顾客的年龄比例。",
    },
  },
};

/** The server sends one or two codes per cell, in display order. */
export const shownCellReasons = 2;

/**
 * @param value The `reasonsByCellId` object of GET /api/v2/cells/reasons
 * @returns Known codes by cell ID for cells with status AVAILABLE. Other
 * statuses, unknown codes and malformed entries are dropped so a card never
 * shows an empty or wrong chip.
 */
export function parseCellReasons(
  value: unknown,
): Record<string, CellReasonCode[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([id, entry]) => {
      const cell = entry as { status?: unknown; reasons?: unknown } | null;
      if (cell?.status !== "AVAILABLE" || !Array.isArray(cell.reasons))
        return [];
      const codes = cell.reasons.flatMap((reason) => {
        const code = (reason as { code?: unknown } | null)?.code;
        return typeof code === "string" && Object.hasOwn(copy, code)
          ? [code as CellReasonCode]
          : [];
      });
      return codes.length ? [[id, codes.slice(0, shownCellReasons)]] : [];
    }),
  );
}

/** @returns The short chip label for a list card. */
export function cellReasonChip(
  code: CellReasonCode,
  language: DiscoveryLanguage,
): string {
  return copy[code].chip[language];
}

/** @returns The full sentence, used as the chip's accessible description. */
export function cellReasonText(
  code: CellReasonCode,
  language: DiscoveryLanguage,
): string {
  return copy[code].full[language];
}
