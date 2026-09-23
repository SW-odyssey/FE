# ODI (오디) — Project Context

Last updated: 2026-09-23

## 1. Project identity

- Team name: **오디세이**
- App/service working name: **오디 (ODI)**
- Capstone project title: **유동인구 이동패턴 기반 위치 추천 서비스 개발**
- Partner data provider: **LG U+**
- Initial target area: **Gangnam**
- Client: **Next.js mobile-first web app**
- Language: **TypeScript**
- Brand direction: **purple family ("오디색")**
- Selected logo direction: **Odi-02 symbol**
  - purple map-pin form
  - curved route/path motif inside the pin

React Native was previously considered but has been replaced by the Next.js mobile-first web direction.

---

## 2. One-line product definition

A location-based place exploration service that uses historical floating-population movement data to show **which blocks people matching the user's selected conditions moved to most**, then lets the user explore places inside those blocks and continue the journey from a selected place.

User-facing concept:

> “나와 비슷한 사람들은 지금 여기서 어디로 갈까?”

The service is intended to help the user decide **where to go next**.

---

## 3. Core data interpretation

### LG U+ movement data

Used to determine:

- origin block
- destination block
- movement population/count
- age-group attributes
- gender attributes
- date/time-related attributes available in the supplied dataset

Important:

- The service exposes **outflow/destination movement** to users.
- Inflow data may be used internally later for logic or other features, but it is not currently user-facing.
- Movement is interpreted at the **block level**, not the individual store level.

### Kakao place data

Kakao place-search data is used to determine:

- places near/current location during initial place selection
- places located inside a selected destination block
- place names and details
- place coordinates
- Kakao's existing place categories

Important:

> Movement to a block does not mean the movement population visited a specific place inside that block.

---

## 4. Spatial model

- Gangnam is divided into **50m × 50m blocks**.
- A user-selected place belongs to one block.
- That block becomes the origin block.
- Destination candidates are other blocks satisfying the active filters and search-radius constraint.
- The user ultimately sees the top 3 destination blocks.

---

## 5. Initial user flow

1. The web app opens with the user's GPS/current location as the starting context.
2. The service asks the user to identify the specific place they are currently at.
3. The user searches for a place, for example:
   - `스타벅스 강남역점`
4. Kakao place-search results are shown.
5. The user selects the correct place.
6. The selected place's coordinates determine the current **50m × 50m origin block**.
7. Movement analysis runs using the current/default filters.
8. The map shows the top 3 destination blocks.

GPS alone is **not** the final origin selection.

The selected Kakao place determines the actual origin block.

---

## 6. Filters

All detailed filters may be changed by the user.

### User-adjustable filters

- time range
- age group
- gender
- search radius / range

### Automatic/default context

The service should preconfigure filters based on the current context as much as the available historical data permits.

Current concept:

- year: selected automatically according to available data
- month: current month equivalent
- weekday/weekend: determined automatically from the current date
- time: current time through two hours later
- age: all by default
- gender: all by default
- radius: default value to be finalized

The user can change available detailed filters.

---

## 7. Time behavior

Default analysis window:

> **current time through two hours later**

This does **not** mean real future prediction.

The system maps the current context to corresponding **historical movement data**.

Example:

If the current time is 14:00, the service may analyze movement records corresponding to the 14:00–16:00 time window under equivalent date/weekday conditions.

### Chain behavior

When the user selects a place and moves to the next analysis step:

- keep the same time filter;
- keep the same age filter;
- keep the same gender filter;
- keep the same search radius.

The service does **not** automatically advance:

`14–16 → 16–18`

The chain remains under the same selected analysis conditions unless the user changes them.

---

## 8. Historical-data policy

This project uses historical data rather than a predictive model.

Current planned data policy:

- **January–August:** use 2026 data where available.
- **September–December:** use 2025 data until the corresponding 2026 data is available.

Therefore, preferred descriptions are:

- “현재와 비슷한 조건에서 사람들이 어디로 많이 이동했는지 보여준다.”
- “이 시간대에는 사람들이 어느 지역으로 많이 이동했을까?”
- “선택한 조건과 유사한 과거 이동패턴을 확인한다.”

Avoid unsupported claims such as:

- “앞으로 2시간 뒤 어디로 갈지 예측한다.”
- “이 사용자가 다음에 이 매장을 방문한다.”

The exact temporal granularity of the LG U+ dataset is **currently unknown**.

Do not invent 15-minute, 30-minute, or hourly granularity until confirmed.

---

## 9. Search radius

The user can limit destination exploration by distance from the current origin.

Current plan:

- search radius adjustable in **250m increments**
- exact min/max values are not finalized
- 250m interval may change after testing

Processing rule:

1. Apply all demographic/time filters.
2. Exclude destination blocks outside the selected radius.
3. Aggregate movement population by remaining destination block.
4. Sort by movement population count.

Distance is therefore a **candidate filter**, not a ranking weight.

Do not add distance-weighted scoring.

---

## 10. Destination ranking

After applying the active filters and radius:

1. Aggregate movement population by destination block.
2. Sort by **movement population count descending**.
3. Return the top **3 destination blocks**.

Current ranking does not include:

- distance weighting
- weighted ratios
- popularity scores invented by the app
- recommendation-model scores

If this changes later, update `docs/DECISIONS.md`.

---

## 11. Main result screen

The main map/result experience should communicate:

- selected current place
- origin 50m × 50m block
- active filters
- top 3 destination blocks
- rank labels: **1, 2, 3**
- movement direction from origin toward each destination

The precise visual design may evolve.

The product should feel like a **consumer place-exploration service**, not a heavy business analytics dashboard.

---

## 12. Destination-block interaction

When the user taps one of the top 3 blocks:

1. Open a place list, likely using a mobile-friendly bottom sheet or equivalent UI.
2. Show only places that are located inside the selected 50m × 50m block.
3. Use Kakao place-search data for the place information.
4. Allow filtering using **Kakao's existing place categories**.

Correct wording examples:

- “이 블록에 있는 장소”
- “이 지역의 장소”
- “이 지역에서 탐색할 수 있는 장소”

Avoid:

- “사람들이 많이 방문한 매장”
- “20대 여성이 가장 많이 간 카페”

unless separate data explicitly supports such store-level claims.

---

## 13. Chained exploration

This is a core differentiator of ODI.

When the user selects a place from a destination block's place list:

1. Get the selected place coordinates.
2. Identify its 50m × 50m block.
3. Set that block as the new origin.
4. Preserve the active filters.
5. Query movement data again.
6. Show the new top 3 destination blocks.
7. Let the user repeat the process.

Conceptual flow:

`현재 장소`
→ `TOP 3 이동 블록`
→ `블록 선택`
→ `블록 내 장소 목록`
→ `장소 선택`
→ `새 출발 블록`
→ `새 TOP 3`
→ `...`

The service therefore supports continuous/chain-based place exploration rather than one-shot recommendations.

---

## 14. User-visible vs internal data

### User-visible

- outflow/destination movement
- top 3 destination blocks
- movement population/count where appropriate
- places inside a selected block
- Kakao categories
- time / age / gender / radius filters

### Internal / possible future use

- inflow data
- recommendation improvements
- regional movement-pattern analysis
- additional movement features not yet defined

Do not add an inflow tab or inflow UI unless the requirement changes.

---

## 15. Frontend technology direction

### Chosen stack

- **Next.js**
- **TypeScript**
- mobile-first responsive web UI

### Primary browser/platform target

Smartphone browser experience first.

Desktop support should remain usable, but desktop is not the initial design priority.

### Map

Current intended direction:

- **Kakao Maps JavaScript SDK**

Expected uses:

- map display
- origin/destination visualization
- block overlays
- movement lines/arrows or equivalent visual cues
- block click/tap interaction

Exact map implementation details should be validated early.

### Location

Use browser/device geolocation for starting context.

Requirements to handle:

- user permission granted
- permission denied
- geolocation unavailable/error
- GPS accuracy limitations

### Place search

Use Kakao place-search REST/API capabilities as appropriate for:

- initial exact-place search
- destination-block place lists
- Kakao place categories

Do not expose server-only secrets to client JavaScript.

---

## 16. Backend / database direction

**Not finalized yet.**

Do not assume any of the following without a later decision:

- Supabase
- Firebase
- PostgreSQL
- MySQL
- MongoDB
- Node/Express separate server
- NestJS
- Spring
- serverless-only architecture

However, architecture should account for the likelihood that raw LG U+ movement data may be too large or inappropriate to ship directly to the browser.

Preferred separation:

`Next.js mobile web UI`
→ `application/API layer`
→ `processed/queryable movement data`

The exact implementation will be chosen after inspecting the real dataset.

---

## 17. Suggested frontend structure

This is guidance, not a hard requirement.

Possible separation:

- `app/` — Next.js routes/pages/layouts
- `components/map/` — Kakao map and map overlays
- `components/places/` — place search/list/category UI
- `components/filters/` — time/age/gender/radius controls
- `features/movement/` — top-3 movement feature logic/UI
- `lib/kakao/` — Kakao integrations
- `lib/geo/` — block/grid/spatial utilities
- `types/` — shared TypeScript models

Keep spatial/business logic testable outside React components.

---

## 18. Early technical validation priorities

Before building the complete UI, validate:

1. Kakao Map renders correctly inside Next.js.
2. It works correctly on a real mobile browser.
3. Browser geolocation works with proper permission/error states.
4. Kakao place search works.
5. Place coordinates can be mapped deterministically to a 50m × 50m block.
6. 50m block polygons/overlays can be rendered and tapped.
7. Sample movement data can produce top 3 destination blocks.
8. Destination-block place lists can be restricted to places inside the selected block.
9. Selecting a place correctly starts a new chain step.
10. Real LG U+ data size/query performance is acceptable with the chosen backend/data design.

---

## 19. Brand/UI direction

- Primary brand family: purple / violet
- Internal nickname for brand color: **오디색**
- Selected symbol direction: **Odi-02**
- Visual motif: location pin + flowing route/path
- App/service should feel:
  - modern
  - approachable
  - location-oriented
  - movement-oriented
  - consumer-facing

Avoid overloading the primary logo/app icon with:

- symbol
- Korean wordmark
- English wordmark

all at once.

The selected logo direction favors a standalone purple symbol.

---

## 20. Data semantics that must not be violated

These are hard product rules unless explicitly changed:

- **Block movement ≠ store visit**
- **Historical movement ≠ future prediction**
- **GPS coordinate ≠ final origin place until the user selects/confirms a Kakao place**
- **Search radius = candidate filter, not ranking weight**
- **Top 3 = movement population count ranking after filters**
- **Chain exploration preserves filters unless the user changes them**
- **User-facing movement is currently outflow only**
- **Kakao categories remain unchanged for the initial implementation**

---

## 21. Currently unresolved

Do not invent answers for:

- exact time granularity of LG U+ movement data
- final backend/database architecture
- exact Kakao map integration details until implementation is tested
- final radius minimum/maximum
- whether 250m increments remain after testing
- team-member development responsibilities
- final API/data schema after the real LG U+ dataset is inspected
- any recommendation/scoring model beyond movement-count ranking
