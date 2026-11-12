/**
 * 날짜 계산은 모두 이 파일에서 합니다.
 *
 * dayKey = 휴대폰의 "현지 시간" 기준 날짜 문자열 "yyyy-MM-dd".
 * UTC(toISOString)를 쓰면 한국에서는 오전 9시에 날짜가 바뀌므로 절대 쓰지 않습니다.
 * "yyyy-MM-dd"는 글자 순서 = 날짜 순서라서 문자열 비교(<, <=)로 날짜를 비교할 수 있습니다.
 */
import { now } from './clock';

export type DayKey = string;

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Date → 현지 시간 기준 dayKey */
export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 오늘의 dayKey (clock.ts의 "지금" 기준) */
export function todayKey(): DayKey {
  return toDayKey(now());
}

/** 실제로 존재하는 날짜인지까지 확인 (예: 2026-02-30은 false) */
export function isValidDayKey(key: string): boolean {
  const m = DAY_KEY_RE.exec(key);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(y, mo);
}

/** dayKey → 그날 현지 시간 00:00의 Date */
export function parseDayKey(key: DayKey): Date {
  const m = DAY_KEY_RE.exec(key);
  if (!m || !isValidDayKey(key)) throw new Error(`잘못된 날짜 형식: ${key}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 날짜를 n일 앞/뒤로 옮김 (월말·연말·윤년 자동 처리) */
export function addDays(key: DayKey, n: number): DayKey {
  const d = parseDayKey(key);
  // 연·월·일 숫자로 다시 만들어서, 서머타임으로 하루가 23/25시간인 날에도 날짜가 밀리지 않게 함
  return toDayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** month: 1~12 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 오늘 이후(미래) 날짜인지 */
export function isFuture(key: DayKey, today: DayKey = todayKey()): boolean {
  return key > today;
}

/** 다음 자정까지 남은 밀리초 (앱을 켜 둔 채 자정이 지날 때 타이머용) */
export function msUntilNextMidnight(from: Date = now()): number {
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  return Math.max(0, next.getTime() - from.getTime());
}

/** 화면 표시용: "11월 12일 (목)" */
export function formatDayLabel(key: DayKey): string {
  const d = parseDayKey(key);
  const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${week})`;
}
