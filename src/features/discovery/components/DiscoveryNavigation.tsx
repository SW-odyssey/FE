"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { SegmentedChoice } from "./SegmentedChoice";
type Props = Pick<
  DiscoveryController,
  "navigate" | "t" | "view" | "courseMap"
> & {
  compact: boolean;
  desktop: boolean;
};
export function DiscoveryNavigation(props: Props) {
  const { navigate, t, view, courseMap, compact, desktop } = props;
  const places = {
    value: "discover",
    icon: "places",
    title: t("Places", "장소"),
  } as const;
  const course = {
    value: "course",
    icon: "route",
    title: t("Course", "코스"),
  } as const;
  const map = { value: "map", icon: "map", title: t("Map", "지도") } as const;
  return (
    <SegmentedChoice
      as="nav"
      className={`local-bottom-nav ${compact ? "is-compact" : ""}`}
      label={t("Main navigation", "주요 메뉴")}
      value={
        view === "map" && courseMap
          ? "course"
          : desktop && view === "map"
            ? "discover"
            : view
      }
      onChange={navigate}
      options={(desktop ? [places, course] : [places, course, map]).map(
        ({ value, icon, title }) => ({
          value,
          label: (
            <>
              <LocalIcon name={icon} size={20} />
              <span>{title}</span>
            </>
          ),
        }),
      )}
    />
  );
}
