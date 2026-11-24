import { handlePlaceSummary } from "../../../../server/place-summary.ts";

export const dynamic = "force-dynamic";

export function POST(request) {
  return handlePlaceSummary(request, process.env.GEMINIAI_API_KEY);
}
