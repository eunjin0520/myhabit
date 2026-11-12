/**
 * 연속 달성일 계산 (계획서 7장 6번)
 * 오늘이 체크되어 있으면 오늘부터, 아니면 어제부터 거꾸로 하루씩 세어 첫 빈 날에서 멈춥니다.
 * 그래서 오늘 아직 체크하지 않았다고 연속 기록이 0이 되지 않습니다.
 */
import { addDays, type DayKey } from './dayKey';

export function computeStreak(checkedDays: ReadonlySet<DayKey>, today: DayKey): number {
  let day = checkedDays.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (checkedDays.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}
