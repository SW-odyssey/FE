"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { LanguageButton } from "./LanguageButton";
type Props = Pick<DiscoveryController, "query" | "setModal" | "setQuery" | "t">;
export function SearchHeader(props: Props) {
  const { query, setModal, setQuery, t } = props;
  return (
    <header className="local-search-header">
      <LanguageButton
        label={t("Choose language", "언어 선택")}
        onClick={() => setModal("menu")}
      />
      <div className="local-search">
        <label className="local-search-field">
          <LocalIcon name="search" size={19} />
          <input
            value={query}
            inputMode="search"
            enterKeyHint="search"
            maxLength={80}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder={t("Search places", "장소 검색")}
            aria-label={t("Search places", "장소 검색")}
          />
        </label>
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label={t("Clear search", "검색어 지우기")}
          >
            <LocalIcon name="x" size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
