/**
 * 날짜별로 "보일 습관"과 달성률을 계산합니다. (계획서 7장 3·5번)
 * 달성률은 저장하지 않고 그때그때 계산하므로, 습관을 삭제하면 지난 날짜 달성률도 자동으로 바뀝니다.
 */
import type { Habit } from './db';
import type { DayKey } from './dayKey';

/** 날짜 D에 보일 습관: 추가한 날(startDayKey) ≤ D 인 습관만, 표시 순서대로 */
export function habitsVisibleOn(habits: readonly Habit[], day: DayKey): Habit[] {
  return habits
    .filter((h) => h.startDayKey <= day)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface DayProgress {
  done: number;
  total: number;
  /** 0~1, 보일 습관이 없으면 null */
  rate: number | null;
}

/**
 * @param checkedHabitIds 그날 체크된 습관 id 목록
 */
export function dayProgress(
  habits: readonly Habit[],
  checkedHabitIds: ReadonlySet<string>,
  day: DayKey,
): DayProgress {
  const visible = habitsVisibleOn(habits, day);
  const done = visible.filter((h) => checkedHabitIds.has(h.id)).length;
  const total = visible.length;
  return { done, total, rate: total === 0 ? null : done / total };
}
