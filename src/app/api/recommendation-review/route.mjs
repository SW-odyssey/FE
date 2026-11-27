import { onRequestGet } from "../../../../functions/api/recommendation-review.ts";

export const dynamic = "force-dynamic";
// Same Access variables as the Pages Functions env (#84).
export const GET = (request) => onRequestGet({ request, env: process.env });
export const POST = GET;
