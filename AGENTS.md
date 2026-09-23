# AGENTS.md

## Project context

This repository is for **ODI (오디)**, team **오디세이**, an industry-linked capstone project using LG U+ floating-population movement data.

Before planning or implementing product behavior, read:

- `docs/PROJECT_CONTEXT.md`
- `docs/DECISIONS.md`

Treat those files as the source of truth for product requirements.

## Current frontend direction

The client is a **Next.js + TypeScript mobile-first web app**.

Do not reintroduce React Native unless the user explicitly changes the decision.

The initial UI should be designed primarily for smartphone-width screens, while remaining usable in desktop browsers.

## Working rules

- Do not invent product requirements when a detail is marked unresolved. Ask the user instead.
- Preserve the distinction between **block-level movement** and **store-level visits**.
  - LG U+ movement data supports movement between blocks.
  - It does not prove that a person visited a specific store inside a block.
- Do not describe the service as predicting the future.
  - It uses historical movement data matched to the user's current conditions.
- Keep existing filter values when chaining from one selected place/block to the next unless the user explicitly changes them.
- Rank destination blocks by movement population count after applying the active filters and user-selected search radius.
- Do not add distance weights, recommendation scores, or extra ranking heuristics unless explicitly requested.
- Prefer TypeScript for all new application code.
- When a product decision conflicts with existing code or older documentation, surface the conflict instead of silently choosing one.
- Never commit API keys, private credentials, or secrets.

## Data responsibility boundaries

Keep these concerns separate:

### LG U+ data
Responsible for:
- origin block
- destination block
- movement population/count
- age
- gender
- date/time attributes available in the supplied data

### Kakao place data
Responsible for:
- place search
- place name/details
- place coordinates
- Kakao place categories
- places located inside a selected block

Never use Kakao place data to imply that LG U+ users visited a specific store.

## Development approach

Build the smallest testable vertical slice first:

1. Render Kakao Map in Next.js.
2. Acquire browser geolocation with permission handling.
3. Search/select a place through Kakao.
4. Convert selected place coordinates to the 50m × 50m origin block.
5. Render/select block overlays on the map.
6. Use sample movement data to calculate and display the top 3 destination blocks.
7. Tap a destination block and show places inside it.
8. Select a place and repeat the analysis from its block.
9. Replace sample movement data with the real LG U+ dataset.

Validate map behavior on actual mobile browsers early.

## Architecture guidance

- Keep movement-analysis/query logic independent from UI components.
- Keep Kakao map rendering independent from LG U+ data transformation.
- Keep the frontend from depending directly on raw large LG U+ files.
- Backend/database architecture is not yet finalized; do not assume one without a decision.
- Prefer server-side/API boundaries for secrets and large-data queries.
- Kakao JavaScript SDK browser keys and Kakao REST API usage must follow the correct client/server exposure rules when implementation begins.
