# ODI — Decision Log

Last updated: 2026-09-23

## Confirmed product decisions

- Team name: **오디세이**
- Working service/app name: **오디 (ODI)**
- Project title: **유동인구 이동패턴 기반 위치 추천 서비스 개발**
- Target region for the project: **Gangnam**
- Spatial unit: **50m × 50m block**
- User-facing movement data: **outflow only**
- Inflow data: reserved for internal/future use
- Initial GPS location provides starting context
- User selects the exact current place from **Kakao place search results**
- Selected place determines the origin block
- User-adjustable filters:
  - time
  - age
  - gender
  - search radius
- Default time concept: current time through two hours later, interpreted using historical data
- Chain exploration keeps the same active filters
- Search radius is currently planned in **250m increments**
- Radius interval may change after testing
- Destination ranking uses **movement population count**
- No distance weighting
- Return the top **3 destination blocks**
- Tapping a destination block shows places inside that block
- Initial category system uses **Kakao's categories as provided**
- Selecting a place sets that place's block as the new origin and immediately continues the chain
- January–August use 2026 data where available
- September–December temporarily use 2025 data until corresponding 2026 data exists
- Product must not be described as future prediction
- Block movement must not be described as proof of individual store visits
- Brand family: purple / “오디색”
- Selected logo direction: **Odi-02**, purple map pin + route motif

## Confirmed technology decisions

- **Next.js + TypeScript**
- **Mobile-first web app**
- React Native was considered previously and is **no longer the selected direction**
- Current map direction: **Kakao Maps JavaScript SDK**
- Current-place and destination-place discovery uses Kakao place-search capabilities
- Browser/device geolocation is used for initial location context

## Superseded decisions

### React Native client

Status: **superseded**

Reason:
- Team has React experience.
- The service is primarily map/data/place-search driven.
- A mobile-first Next.js implementation reduces native integration complexity and speeds capstone MVP development.

Agents must not treat React Native as the current architecture unless the user explicitly changes the decision again.

## Open decisions

- Exact time granularity of LG U+ data
- Backend/database technology
- Exact movement-data storage/query architecture
- Final search-radius min/max
- Whether 250m increments remain
- Team-member implementation roles
- Final Kakao integration details after technical validation
- Production deployment platform
- PWA scope, if any
