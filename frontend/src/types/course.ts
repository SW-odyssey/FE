/**
 * 코스 도메인 타입.
 * 화면은 이 타입만 바라보고, 백엔드 연동 시 lib/api.ts 의 목 fetcher만 교체한다.
 */

/** 이동 수단 */
export type TransportMode = "walk" | "car";

/** 동네 (성수·서울숲, 연남, 을지로 …) */
export interface Area {
  id: string;
  /** 표시 이름 - "성수·서울숲" */
  name: string;
  /** 칩에 쓰는 짧은 이름 - "성수" */
  shortName: string;
}

/** 장소 */
export interface Place {
  id: string;
  name: string;
  /** "카페", "산책·자연" 같은 노출용 카테고리 */
  category: string;
  areaId: string;
  imageUrl: string;
  address: string;
  lat: number;
  lng: number;
}

/** 데이트 취향 (2/3 단계에서 고르는 카드) */
export interface Mood {
  id: string;
  /** "산책과 여유" */
  label: string;
  imageUrl: string;
  /** 선택 시 따라붙는 분위기 태그 - ["잔잔한"] */
  tags: string[];
}

/** 코스 생성 조건 (1/3 ~ 3/3 에서 모으는 값) */
export interface CourseCondition {
  areaId: string | null;
  /** ISO 날짜 - "2026-09-12" */
  date: string | null;
  /** "14:00" */
  startTime: string;
  /** "18:00" */
  endTime: string;
  moodIds: string[];
  /** 원 단위, null이면 제한 없음 */
  budget: number | null;
  transport: TransportMode;
}

/** 코스 안의 한 장소 */
export interface CourseStep {
  /** 1부터 */
  order: number;
  /** 도착 시각 - "14:00" */
  arriveAt: string;
  place: Place;
  /** 체류 시간(분) */
  stayMinutes: number;
  /** 다음 장소까지 이동. 마지막 스텝은 없음 */
  travelToNext?: {
    mode: TransportMode;
    minutes: number;
  };
}

/** 완성된 코스 */
export interface Course {
  id: string;
  /** "커피와 술길의 오후" */
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  steps: CourseStep[];
  /** 예상 비용(원) */
  estimatedBudget: number;
}

/** 홈 화면의 "지금 가기 좋은 곳" 카드 */
export interface PlaceSuggestion {
  place: Place;
  /** 추천 사유 한 줄 */
  reason?: string;
}
