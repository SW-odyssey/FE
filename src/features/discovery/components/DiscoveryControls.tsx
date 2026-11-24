"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { DiscoveryContextBar } from "./DiscoveryContextBar";
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
  | "liveRecommendations"
  | "category"
  | "chooseCategory"
>;
export function DiscoveryControls(props: Props) {
  const { t, activity, spaces, openFilters, category, chooseCategory } = props;
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
          <LocalIcon
            name={
              id === "all" ? "places" : id === "cafe" ? "coffee" : "utensils"
            }
            size={16}
          />
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
      <DiscoveryContextBar {...props}>
        {!props.liveRecommendations && (
          <button
            className={`local-icon-button local-filter-button ${activity !== "any" || spaces.length ? "has-filter" : ""}`}
            onClick={openFilters}
            aria-label={t("Filters", "필터")}
            aria-pressed={activity !== "any" || spaces.length > 0}
          >
            <LocalIcon name="filter" />
          </button>
        )}
      </DiscoveryContextBar>
      {categoryTabs}
    </div>
  );
}
