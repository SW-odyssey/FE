import type { VisitSlot } from "./model";
export const LANGUAGE_KEY = "local-seoul-language-v1";
export const areaLabels = {
  en: {
    all: "All areas",
    jongno: "Jongno",
    ikseon: "Ikseon-dong",
    insa: "Insadong",
    eulji: "Euljiro",
    bukchon: "Bukchon",
  },
  ko: {
    all: "전체 지역",
    jongno: "종로",
    ikseon: "익선동",
    insa: "인사동",
    eulji: "을지로",
    bukchon: "북촌",
  },
  ja: {
    all: "すべてのエリア",
    jongno: "鍾路",
    ikseon: "益善洞",
    insa: "仁寺洞",
    eulji: "乙支路",
    bukchon: "北村",
  },
  zh: {
    all: "全部区域",
    jongno: "钟路",
    ikseon: "益善洞",
    insa: "仁寺洞",
    eulji: "乙支路",
    bukchon: "北村",
  },
};
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
