import type { Course, CourseCondition, PlaceSuggestion } from "@/types/course";
import { findPlace, MOCK_PLACES } from "./places";

/** 위저드를 아직 안 거쳤을 때 쓰는 기본 조건 */
export const DEFAULT_CONDITION: CourseCondition = {
  areaId: null,
  date: null,
  startTime: "14:00",
  endTime: "18:00",
  moodIds: [],
  budget: 50000,
  transport: "walk",
};

export const MOCK_COURSE: Course = {
  id: "coffee-and-sulgil",
  title: "커피와 술길의 오후",
  date: "2026-09-12",
  startTime: "14:00",
  endTime: "18:00",
  estimatedBudget: 50000,
  steps: [
    {
      order: 1,
      arriveAt: "14:00",
      place: findPlace("bmarket-seoulsup"),
      stayMinutes: 80,
      travelToNext: { mode: "walk", minutes: 8 },
    },
    {
      order: 2,
      arriveAt: "15:20",
      place: findPlace("seoulsup"),
      stayMinutes: 80,
      travelToNext: { mode: "walk", minutes: 12 },
    },
    {
      order: 3,
      arriveAt: "17:00",
      place: findPlace("onryang"),
      stayMinutes: 60,
    },
  ],
};

/** 홈 - 지금 가기 좋은 곳 */
export const MOCK_SUGGESTIONS: PlaceSuggestion[] = MOCK_PLACES.map((place) => ({
  place,
}));
