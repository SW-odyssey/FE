import { handlePlaceSummary } from "../../../../server/place-summary.ts";

export const dynamic = "force-dynamic";

export function POST(request) {
  // Same variable names as the Pages Functions env (#82).
  return handlePlaceSummary(
    request,
    process.env.GEMINIAI_API_KEY,
    undefined,
    process.env,
  );
}
