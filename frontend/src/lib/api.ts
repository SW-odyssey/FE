/**
 * 데이터 접근 레이어.
 * 지금은 목 데이터를 그대로 돌려주고, 백엔드가 준비되면 이 파일의 구현만 fetch로 바꾼다.
 * (화면은 이 함수들의 반환 타입에만 의존할 것)
 */
import type { Area, Course, Mood, PlaceSuggestion } from "@/types/course";
import {
  MOCK_AREAS,
  MOCK_COURSE,
  MOCK_MOODS,
  MOCK_SUGGESTIONS,
} from "@/lib/mock";

export async function getAreas(): Promise<Area[]> {
  return MOCK_AREAS;
}

export async function getMoods(): Promise<Mood[]> {
  return MOCK_MOODS;
}

export async function getSuggestions(): Promise<PlaceSuggestion[]> {
  return MOCK_SUGGESTIONS;
}

export async function getCourse(id: string): Promise<Course> {
  return { ...MOCK_COURSE, id };
}
