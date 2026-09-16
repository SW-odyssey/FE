import type { Mood } from "@/types/course";

export const MOCK_MOODS: Mood[] = [
  {
    id: "walk",
    label: "산책과 여유",
    imageUrl: "https://picsum.photos/seed/odyssey-walk/400/400",
    tags: ["잔잔한"],
  },
  {
    id: "meal",
    label: "맛있는 한 끼",
    imageUrl: "https://picsum.photos/seed/odyssey-meal/400/400",
    tags: ["파인 다이닝"],
  },
  {
    id: "cafe",
    label: "카페와 대화",
    imageUrl: "https://picsum.photos/seed/odyssey-cafe/400/400",
    tags: ["라이트"],
  },
  {
    id: "wine",
    label: "저녁과 와인",
    imageUrl: "https://picsum.photos/seed/odyssey-wine/400/400",
    tags: ["파인 다이닝"],
  },
];
