"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
type Props = Pick<DiscoveryController, "query" | "setModal" | "setQuery" | "t">;
export function SearchHeader(props: Props) {
  const { query, setModal, setQuery, t } = props;
  return (
    <header className="local-search-header">
      <button
        className="local-icon-button"
        aria-label={t("Choose language", "언어 선택")}
        onClick={() => setModal("menu")}
      >
        {
          <svg
            className="local-language-mark"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M7 2v3M2 5h12M11 5c-1.1 4-3.5 7-7.5 9M4.5 8c1.4 2.4 3.4 4.5 6.2 6" />
            <path d="m12 22 5-10 5 10M14 18h6" />
          </svg>
        }
      </button>
      <div className="local-search">
        <LocalIcon name="search" size={19} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder={t("Search places", "장소 검색")}
          aria-label={t("Search places", "장소 검색")}
        />
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
