import { LocalIcon } from "../../../components/ui/LocalIcon";
import type { DiscoveryController } from "../hooks/useDiscoveryController";
import type { LocalPlace } from "../model";
import {
  discoveryCopy,
  recommendationExplanation,
} from "../recommendation-analysis";
export function PlaceSummary({
  place,
  analysisFor,
  language,
}: Pick<DiscoveryController, "analysisFor" | "language"> & {
  place: LocalPlace;
}) {
  const analysis = analysisFor(place);
  const copy = discoveryCopy[language];
  return (
    <div className="local-ai-summary">
      <span>
        <LocalIcon name="sparkles" size={18} />
        {copy.analysis}
      </span>
      <p>
        {analysis
          ? recommendationExplanation(analysis, language)
          : copy.unavailable}
      </p>
    </div>
  );
}
