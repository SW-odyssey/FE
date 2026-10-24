"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
type Props = Pick<
  DiscoveryController,
  | "currentArea"
  | "setModal"
  | "t"
  | "contextAreaLabel"
  | "openTime"
  | "timeLabel"
  | "activity"
  | "spaces"
  | "openFilters"
  | "category"
  | "chooseCategory"
>;
export function DiscoveryControls(props: Props) {
  const {
    currentArea,
    setModal,
    t,
    contextAreaLabel,
    openTime,
    timeLabel,
    activity,
    spaces,
    openFilters,
    category,
    chooseCategory,
  } = props;
  const context = (
    <div className="local-context">
      <button
        className="local-area-select"
        data-location={currentArea ? "current" : "selected"}
        onClick={() => setModal("area")}
        aria-label={`${currentArea ? `${t("Current location", "현위치")}: ` : ""}${contextAreaLabel}. ${t("Choose area", "지역 선택")}`}
      >
        <span>{contextAreaLabel}</span>
        <LocalIcon name="chevron-right" size={16} />
      </button>
      <button
        className="local-time-select"
        onClick={() => openTime()}
        aria-label={t("Choose visit time", "방문 시간 선택")}
      >
        <LocalIcon name="clock" size={16} />
        <span>{timeLabel}</span>
      </button>
      <button
        className={`local-icon-button local-filter-button ${activity !== "any" || spaces.length ? "has-filter" : ""}`}
        onClick={openFilters}
        aria-label={t("Filters", "필터")}
      >
        <LocalIcon name="filter" />
      </button>
    </div>
  );
  const categoryTabs = (
    <div
      className="local-category-tabs"
      aria-label={t("Place type", "장소 유형")}
    >
      {(["all", "cafe", "food"] as const).map((id) => (
        <button
          key={id}
          className={category === id ? "is-active" : ""}
          aria-pressed={category === id}
          onClick={() => chooseCategory(id)}
        >
          {id === "all"
            ? t("All", "전체")
            : id === "cafe"
              ? t("Cafés", "카페")
              : t("Restaurants", "음식점")}
        </button>
      ))}
    </div>
  );
  return (
    <div className="local-discovery-controls">
      {context}
      {categoryTabs}
    </div>
  );
}
