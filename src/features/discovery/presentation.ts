import type {
  AreaId,
  DiscoveryArea,
  DiscoveryLanguage,
  VisitSlot,
} from "./model";
export const LANGUAGE_KEY = "local-seoul-language-v1";
/** FE translations for server area IDs. Unknown IDs fall back to the server name. */
export const areaLabels: Record<
  DiscoveryLanguage,
  Record<
    "all" | "jongno" | "ikseon" | "insadong" | "euljiro" | "myeongdong",
    string
  >
> = {
  en: {
    all: "All areas",
    jongno: "Jongno",
    ikseon: "Ikseon-dong",
    insadong: "Insadong",
    euljiro: "Euljiro",
    myeongdong: "Myeongdong",
  },
  ko: {
    all: "전체 지역",
    jongno: "종로",
    ikseon: "익선동",
    insadong: "인사동",
    euljiro: "을지로",
    myeongdong: "명동",
  },
  ja: {
    all: "すべてのエリア",
    jongno: "鍾路",
    ikseon: "益善洞",
    insadong: "仁寺洞",
    euljiro: "乙支路",
    myeongdong: "明洞",
  },
  zh: {
    all: "全部区域",
    jongno: "钟路",
    ikseon: "益善洞",
    insadong: "仁寺洞",
    euljiro: "乙支路",
    myeongdong: "明洞",
  },
};
/** Area IDs offered when no server metadata is used, such as the /guide preview. */
export const fallbackAreaIds: readonly AreaId[] = [
  "jongno",
  "ikseon",
  "insadong",
  "euljiro",
  "myeongdong",
];
/**
 * @param area A server area ID or `all`
 * @param language UI language
 * @param serverName The Korean `areas[].name` from metadata, used for new IDs
 * @returns A display name; never an empty string for a known or named area
 */
export function areaLabel(
  area: DiscoveryArea,
  language: DiscoveryLanguage,
  serverName?: string,
): string {
  return (
    (areaLabels[language] as Record<string, string>)[area] ?? serverName ?? area
  );
}
/** Legacy URL area values from before the server area IDs (#77). */
const legacyAreas: Record<string, DiscoveryArea> = {
  insa: "insadong",
  eulji: "euljiro",
  bukchon: "all",
};
/**
 * @param value The `area` URL value
 * @returns A known server area ID. Old `insa`/`eulji` links move to the server
 * IDs; Bukchon, which the service does not cover, and unknown values open all
 * areas. Whether the ID is still published is checked against the metadata.
 */
export function readAreaParam(value: string | null): DiscoveryArea {
  if (!value) return "all";
  const legacy = legacyAreas[value];
  if (legacy) return legacy;
  return fallbackAreaIds.includes(value) ? value : "all";
}
export const slotLabels = {
  en: {
    lunch: "Lunch",
    afternoon: "Afternoon",
    evening: "Evening",
    late: "Late night",
  },
  ko: { lunch: "점심", afternoon: "오후", evening: "저녁", late: "심야" },
  ja: { lunch: "昼食", afternoon: "午後", evening: "夕方", late: "深夜" },
  zh: { lunch: "午间", afternoon: "下午", evening: "傍晚", late: "深夜" },
};
export type Modal = "area" | "filters" | "time" | "menu" | null;
export type VisitTimeChoice = {
  autoTime: boolean;
  day: number;
  slot: VisitSlot;
};
const monthLocales: Record<DiscoveryLanguage, string> = {
  ko: "ko-KR",
  en: "en-GB",
  ja: "ja-JP",
  zh: "zh-CN",
};
/**
 * @param month Dataset `referenceMonth` as YYYY-MM
 * @param language UI language
 * @returns The data reference month line, e.g. "LG U+ data as of Dec 2025"
 */
export function formatReferenceMonth(
  month: string,
  language: DiscoveryLanguage,
): string {
  const [year, value] = month.split("-").map(Number);
  if (!year || !value) return "";
  const label = new Intl.DateTimeFormat(monthLocales[language], {
    year: "numeric",
    month: language === "en" ? "short" : "long",
    timeZone: "UTC",
  }).format(Date.UTC(year, value - 1, 1));
  return {
    en: `LG U+ data as of ${label}`,
    ko: `LG U+ ${label} 데이터 기준`,
    ja: `LG U+ ${label}時点のデータ`,
    zh: `LG U+ ${label}数据`,
  }[language];
}
/**
 * @param loaded Places shown so far
 * @param total Server match count before paging
 * @param language UI language
 * @returns e.g. "30 of 284 places", or "12 places" once everything is loaded
 */
export function formatLoadedCount(
  loaded: number,
  total: number,
  language: DiscoveryLanguage,
): string {
  const all = Math.max(total, loaded);
  if (loaded >= all)
    return {
      en: `${all} places`,
      ko: `${all}곳`,
      ja: `${all}件`,
      zh: `共${all}家`,
    }[language];
  return {
    en: `${loaded} of ${all} places`,
    ko: `${all}곳 중 ${loaded}곳`,
    ja: `${all}件中${loaded}件`,
    zh: `共${all}家，已显示${loaded}家`,
  }[language];
}
