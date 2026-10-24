import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import type { LocalPlace } from "../model";
export function PlaceSummary({
  place,
  t,
  summary,
}: Pick<DiscoveryController, "t" | "summary"> & {
  place: LocalPlace;
}) {
  return (
    <div className="local-ai-summary">
      <span>
        <LocalIcon name="sparkles" size={18} />
        {t("AI summary", "AI 요약")}
      </span>
      <p>{summary(place)}</p>
    </div>
  );
}
