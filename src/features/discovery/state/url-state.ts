import type {
  DiscoveryArea,
  DiscoveryLanguage,
  DiscoveryView,
} from "../model.ts";
export function readDiscoveryUrl(search: string) {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  const area = params.get("area");
  return {
    view: (["discover", "map"].includes(view ?? "")
      ? view
      : "discover") as DiscoveryView,
    area: (["all", "jongno", "ikseon", "insa", "eulji", "bukchon"].includes(
      area ?? "",
    )
      ? area
      : "all") as DiscoveryArea,
    language: (["en", "ko", "ja", "zh"].includes(params.get("lang") ?? "")
      ? params.get("lang")
      : "en") as DiscoveryLanguage,
    place: params.get("place"),
  };
}
