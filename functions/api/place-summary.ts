import { handlePlaceSummary } from "../../server/place-summary";

/** Bind Gemini's server key in the Cloudflare Pages runtime. */
export function onRequestPost({
  request,
  env,
}: {
  request: Request;
  env: { GEMINIAI_API_KEY?: string };
}) {
  return handlePlaceSummary(request, env.GEMINIAI_API_KEY);
}
