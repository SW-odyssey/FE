import { onRequestGet } from "../../../../functions/api/recommendation-review.ts";

export const dynamic = "force-dynamic";
export const GET = (request) => onRequestGet({ request });
export const POST = GET;
