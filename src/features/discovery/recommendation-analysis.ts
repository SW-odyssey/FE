import { localText, spaceLabels } from "./localization.ts";
import type { RecommendationAnalysis } from "./data/types.ts";
import type { DiscoveryLanguage } from "./model.ts";
import { slotLabels } from "./presentation.ts";

export const discoveryCopy = {
  ko: {
    analysis: "AI 추천 분석",
    unavailable: "추천 근거를 아직 확인할 수 없어요.",
    quiet: "한적함",
    lively: "활기참",
    calendar: "방문 날짜",
    previousMonth: "이전 달",
    nextMonth: "다음 달",
    currentTime: "현재 시간으로",
    apply: "적용",
    featured: "추천 장소",
  },
  en: {
    analysis: "AI recommendation analysis",
    unavailable: "Recommendation evidence is not available yet.",
    quiet: "Less busy",
    lively: "Lively",
    calendar: "Visit date",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    currentTime: "Use current time",
    apply: "Apply",
    featured: "Featured places",
  },
  ja: {
    analysis: "AIおすすめ分析",
    unavailable: "おすすめの根拠はまだ確認できません。",
    quiet: "静か",
    lively: "にぎやか",
    calendar: "訪問日",
    previousMonth: "前の月",
    nextMonth: "次の月",
    currentTime: "現在の時間にする",
    apply: "適用",
    featured: "おすすめスポット",
  },
  zh: {
    analysis: "AI推荐分析",
    unavailable: "暂无推荐依据。",
    quiet: "安静",
    lively: "热闹",
    calendar: "到访日期",
    previousMonth: "上个月",
    nextMonth: "下个月",
    currentTime: "使用当前时间",
    apply: "应用",
    featured: "推荐地点",
  },
};

/** Describe only the supplied recommendation factors, without inventing scores. */
export function recommendationExplanation(
  analysis: RecommendationAnalysis,
  language: DiscoveryLanguage,
): string {
  const matched = analysis.matchedSpaces.length > 0;
  const tags = (matched ? analysis.matchedSpaces : analysis.spaces)
    .map((id) => localText(language, ...spaceLabels[id]))
    .join(" · ");
  const time = slotLabels[language][analysis.slot];
  const activity =
    analysis.activity === "any"
      ? ""
      : discoveryCopy[language][analysis.activity];
  const spaces = !tags
    ? ""
    : {
        ko: matched
          ? `공간 태그에서 선택한 ‘${tags}’ 특징이 확인돼요.`
          : `공간 태그에 ‘${tags}’ 특징이 있어요.`,
        en: matched
          ? `Its space tags match your ${tags} preferences.`
          : `Its space tags include ${tags}.`,
        ja: matched
          ? `空間タグが選択した「${tags}」の条件に合っています。`
          : `空間タグには「${tags}」の特徴があります。`,
        zh: matched
          ? `空间标签符合所选的“${tags}”条件。`
          : `空间标签包含“${tags}”特点。`,
      }[language];
  const selection = {
    ko: activity
      ? `${time} 시간대의 후보 중 ${activity} 조건을 반영해 추천했어요.`
      : `${time} 시간대의 추천 후보에 포함돼요.`,
    en: activity
      ? `It was selected from ${time.toLowerCase()} candidates using your ${activity.toLowerCase()} preference.`
      : `It is included among the ${time.toLowerCase()} recommendation candidates.`,
    ja: activity
      ? `${time}の候補から「${activity}」の条件を反映しておすすめしています。`
      : `${time}のおすすめ候補に含まれています。`,
    zh: activity
      ? `从${time}候选地点中，按“${activity}”条件筛选推荐。`
      : `属于${time}的推荐候选地点。`,
  }[language];
  return [spaces, selection].filter(Boolean).join(" ");
}
