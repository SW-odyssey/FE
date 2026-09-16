import type { Place } from "@/types/course";

export const MOCK_PLACES: Place[] = [
  {
    id: "bmarket-seoulsup",
    name: "보마켓 서울숲",
    category: "카페",
    areaId: "seongsu",
    imageUrl: "https://picsum.photos/seed/odyssey-bmarket/320/320",
    address: "서울 성동구 서울숲2길 32-14",
    lat: 37.5445,
    lng: 127.0447,
  },
  {
    id: "seoulsup",
    name: "서울숲",
    category: "산책·자연",
    areaId: "seongsu",
    imageUrl: "https://picsum.photos/seed/odyssey-seoulsup/320/320",
    address: "서울 성동구 뚝섬로 273",
    lat: 37.5444,
    lng: 127.0374,
  },
  {
    id: "onryang",
    name: "온량",
    category: "분식·요리",
    areaId: "seongsu",
    imageUrl: "https://picsum.photos/seed/odyssey-onryang/320/320",
    address: "서울 성동구 연무장길 33",
    lat: 37.5419,
    lng: 127.0554,
  },
];

export function findPlace(id: string): Place {
  const place = MOCK_PLACES.find((p) => p.id === id);
  if (!place) throw new Error(`mock place not found: ${id}`);
  return place;
}
