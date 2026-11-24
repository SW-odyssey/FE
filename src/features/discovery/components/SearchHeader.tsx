"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import {
  loadPlaceSearch,
  suggestPlaces,
  type PlaceSearchEntry,
} from "../data/place-search";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { LanguageButton } from "./LanguageButton";

type Props = Pick<
  DiscoveryController,
  | "language"
  | "liveRecommendations"
  | "openPlace"
  | "query"
  | "setModal"
  | "setQuery"
  | "t"
>;

export function SearchHeader(props: Props) {
  const {
    language,
    liveRecommendations,
    openPlace,
    query,
    setModal,
    setQuery,
    t,
  } = props;
  const listId = useId();
  const [entries, setEntries] = useState<PlaceSearchEntry[]>([]);
  const [focused, setFocused] = useState(false);
  const [composing, setComposing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestions = useMemo(
    () => suggestPlaces(entries, query, language),
    [entries, query, language],
  );
  const expanded =
    liveRecommendations && focused && !composing && suggestions.length > 0;
  const active = expanded ? suggestions[activeIndex] : undefined;

  function focusSearch() {
    setFocused(true);
    if (liveRecommendations && !entries.length)
      void loadPlaceSearch()
        .then(setEntries)
        .catch(() => {
          // 사전을 가져오지 못해도 현재 입력으로 기존 검색을 계속합니다.
        });
  }

  function changeQuery(value: string) {
    setActiveIndex(-1);
    setFocused(true);
    setQuery(value);
  }

  function selectPlace(id: number) {
    setFocused(false);
    setActiveIndex(-1);
    openPlace({ id: String(id) });
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (!expanded || event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setFocused(false);
      setActiveIndex(-1);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const index = active ? activeIndex : direction === 1 ? -1 : 0;
      const next =
        (index + direction + suggestions.length) % suggestions.length;
      setActiveIndex(next);
      event.currentTarget.ownerDocument
        .getElementById(`${listId}-${suggestions[next].id}`)
        ?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      selectPlace(active.id);
    }
  }

  return (
    <header className="local-search-header">
      <LanguageButton
        label={t("Choose language", "언어 선택")}
        onClick={() => setModal("menu")}
      />
      <div className="local-search-anchor">
        <div className="local-search">
          <label className="local-search-field">
            <LocalIcon name="search" size={19} />
            <input
              value={query}
              inputMode="search"
              enterKeyHint={active ? "go" : "search"}
              autoComplete="off"
              maxLength={80}
              onChange={(e) => changeQuery(e.target.value)}
              onFocus={focusSearch}
              onBlur={() => {
                setFocused(false);
                setComposing(false);
                setActiveIndex(-1);
              }}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              onKeyDown={handleKey}
              placeholder={t("Search places", "장소 검색")}
              aria-label={t("Search places", "장소 검색")}
              role={liveRecommendations ? "combobox" : undefined}
              aria-autocomplete={liveRecommendations ? "list" : undefined}
              aria-expanded={liveRecommendations ? expanded : undefined}
              aria-controls={expanded ? listId : undefined}
              aria-activedescendant={
                active ? `${listId}-${active.id}` : undefined
              }
            />
          </label>
          {query && (
            <button
              onClick={() => changeQuery("")}
              aria-label={t("Clear search", "검색어 지우기")}
            >
              <LocalIcon name="x" size={16} />
            </button>
          )}
        </div>
        {expanded && (
          <ul
            id={listId}
            role="listbox"
            aria-label={t("Suggested places", "장소 추천 검색어")}
            className="local-search-suggestions"
          >
            {suggestions.map(({ id, name }, index) => (
              <li
                key={id}
                id={`${listId}-${id}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPlace(id)}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}
