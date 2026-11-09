"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import { SegmentedChoice } from "./SegmentedChoice";
type Props = Pick<DiscoveryController, "navigate" | "t" | "view"> & {
  compact: boolean;
};
export function DiscoveryNavigation(props: Props) {
  const { navigate, t, view, compact } = props;
  return (
    <SegmentedChoice
      as="nav"
      className={`local-bottom-nav ${compact ? "is-compact" : ""}`}
      label={t("Main navigation", "주요 메뉴")}
      value={view}
      onChange={navigate}
      options={(
        [
          { value: "discover", icon: "places", title: t("Places", "장소") },
          { value: "map", icon: "map", title: t("Map", "지도") },
        ] as const
      ).map(({ value, icon, title }) => ({
        value,
        label: (
          <>
            <LocalIcon name={icon} size={20} />
            <span>{title}</span>
          </>
        ),
      }))}
    />
  );
}
