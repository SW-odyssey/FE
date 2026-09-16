const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-09-12" -> "9월 12일 토요일" */
export function formatKoreanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`;
}

/** 80 -> "1시간 20분" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/** 50000 -> "5만 원" */
export function formatBudget(won: number): string {
  if (won >= 10000) return `${won / 10000}만 원`;
  return `${won.toLocaleString()}원`;
}
