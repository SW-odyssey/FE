import { readAreaParam } from "../presentation.ts";
import type { DiscoveryLanguage, DiscoveryView } from "../model.ts";
export function readDiscoveryUrl(search: string) {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  const area = params.get("area");
  return {
    view: (["discover", "course", "map"].includes(view ?? "")
      ? view
      : "discover") as DiscoveryView,
    area: readAreaParam(area),
    language: (["en", "ko", "ja", "zh"].includes(params.get("lang") ?? "")
      ? params.get("lang")
      : "en") as DiscoveryLanguage,
    place: params.get("place"),
  };
}
