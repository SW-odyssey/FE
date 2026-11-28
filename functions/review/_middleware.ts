import {
  reviewAccess,
  reviewAccessDenied,
  type ReviewAccessEnv,
} from "../../server/review-access.ts";

/** Guard the static /review pages with the same team check as the API (#84). */
export async function onRequest({
  request,
  env,
  next,
}: {
  request: Request;
  env: ReviewAccessEnv;
  next: () => Promise<Response>;
}) {
  if ((await reviewAccess(request, env)) === "denied")
    return reviewAccessDenied();
  return next();
}
