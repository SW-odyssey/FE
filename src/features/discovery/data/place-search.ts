import type { DiscoveryLanguage } from "../model";

export type PlaceSearchEntry = {
  id: number;
  ko: string;
  en: string | null;
  zh: string | null;
  ja: string | null;
};

const languages: DiscoveryLanguage[] = ["ko", "en", "zh", "ja"];
let pending: Promise<PlaceSearchEntry[]> | undefined;

/** 검색창을 열 때 공개 상호 사전을 가져오고, 같은 세션에서 다시 사용합니다. */
export function loadPlaceSearch(): Promise<PlaceSearchEntry[]> {
  pending ??= fetch("/data/place-search.json")
    .then((response) => {
      if (!response.ok) throw new Error("매장 상호 사전 조회 실패");
      return response.json() as Promise<PlaceSearchEntry[]>;
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
}

function normalize(name: string) {
  return name.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

/** 네 언어의 상호를 탐색하고 일치하는 후보를 선택 언어로 최대 여섯 개 반환합니다. */
export function suggestPlaces(
  entries: readonly PlaceSearchEntry[],
  query: string,
  language: DiscoveryLanguage,
) {
  const term = normalize(query);
  if (!term) return [];

  const matches = entries.flatMap((entry) => {
    // 같은 매장의 여러 언어가 일치해도 후보에는 한 번만 올립니다.
    const ranks = languages.flatMap((code) => {
      const title = normalize(entry[code] ?? "");
      if (!title.includes(term)) return [];
      const match = title === term ? 0 : title.startsWith(term) ? 1 : 2;
      return [match * 2 + (code === language ? 0 : 1)];
    });
    if (!ranks.length) return [];
    return [
      {
        id: entry.id,
        name: entry[language] || entry.ko,
        rank: Math.min(...ranks),
      },
    ];
  });
  return matches.sort((a, b) => a.rank - b.rank).slice(0, 6);
}
