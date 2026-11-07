"use client";
import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
type Props = Pick<DiscoveryController, "navigate" | "t" | "view">;
export function DiscoveryNavigation(props: Props) {
  const { navigate, t, view } = props;
  return (
    <nav
      className="local-bottom-nav"
      aria-label={t("Main navigation", "주요 메뉴")}
    >
      {(["discover", "map"] as const).map((id) => (
        <button
          key={id}
          onClick={() => navigate(id)}
          className={view === id ? "is-active" : ""}
          aria-current={view === id ? "page" : undefined}
        >
          <LocalIcon name={id === "discover" ? "places" : "map"} size={22} />
          <span>
            {id === "discover" ? t("Places", "장소") : t("Map", "지도")}
          </span>
        </button>
      ))}
    </nav>
  );
}
