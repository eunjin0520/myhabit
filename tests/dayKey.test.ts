import { afterEach, describe, expect, it } from 'vitest';
import {
  addDays,
  daysInMonth,
  formatDayLabel,
  isFuture,
  isValidDayKey,
  msUntilNextMidnight,
  parseDayKey,
  toDayKey,
  todayKey,
} from '../src/core/dayKey';
import { fixedClock, resetClock, setClock } from '../src/core/clock';

function useTZ(tz: string) {
  process.env.TZ = tz;
}

afterEach(() => {
  useTZ('Asia/Seoul');
  resetClock();
});

describe('dayKey: 서울 시간 기준', () => {
  it('23:59:59 → 00:00:00 넘어갈 때 날짜가 바뀐다', () => {
    useTZ('Asia/Seoul');
    expect(toDayKey(new Date('2026-11-12T23:59:59+09:00'))).toBe('2026-11-12');
    expect(toDayKey(new Date('2026-11-13T00:00:00+09:00'))).toBe('2026-11-13');
  });

  it('오전 9시(UTC 자정 경계)에는 날짜가 바뀌지 않는다', () => {
    useTZ('Asia/Seoul');
    expect(toDayKey(new Date('2026-11-12T08:59:59+09:00'))).toBe('2026-11-12');
    expect(toDayKey(new Date('2026-11-12T09:00:00+09:00'))).toBe('2026-11-12');
    // 새벽 0시 30분은 UTC로는 전날이지만 dayKey는 그날
    expect(toDayKey(new Date('2026-11-12T00:30:00+09:00'))).toBe('2026-11-12');
  });

  it('todayKey는 clock.ts의 지금 시각을 따른다', () => {
    useTZ('Asia/Seoul');
    setClock(fixedClock(new Date('2026-11-12T23:59:00+09:00')));
    expect(todayKey()).toBe('2026-11-12');
    setClock(fixedClock(new Date('2026-11-13T00:00:00+09:00')));
    expect(todayKey()).toBe('2026-11-13');
  });
});

describe('dayKey: 서울 → 뉴욕 시간대', () => {
  it('같은 순간이라도 휴대폰 시간대 기준 날짜를 쓴다', () => {
    const instant = new Date('2026-11-12T10:00:00+09:00'); // 뉴욕은 11일 20:00
    useTZ('Asia/Seoul');
    expect(toDayKey(instant)).toBe('2026-11-12');
    useTZ('America/New_York');
    expect(toDayKey(instant)).toBe('2026-11-11');
  });

  it('서머타임이 바뀌는 날에도 하루씩 정확히 이동한다', () => {
    useTZ('America/New_York');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09'); // 서머타임 시작
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02'); // 서머타임 끝
    expect(addDays('2026-11-02', -1)).toBe('2026-11-01');
  });

  it('저장된 dayKey 문자열은 시간대가 바뀌어도 그대로다', () => {
    useTZ('America/New_York');
    expect(toDayKey(parseDayKey('2026-11-12'))).toBe('2026-11-12');
  });
});

describe('addDays: 월말 · 연말 · 윤년', () => {
  it('월말', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-04-30', 1)).toBe('2026-05-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('연말', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
  it('윤년 2월 29일', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2100, 2)).toBe(28); // 100년 단위는 윤년 아님
    expect(daysInMonth(2000, 2)).toBe(29); // 400년 단위는 윤년
  });
  it('여러 날 이동', () => {
    expect(addDays('2026-11-12', 30)).toBe('2026-12-12');
    expect(addDays('2026-11-12', -365)).toBe('2025-11-12');
  });
});

describe('isValidDayKey', () => {
  it('형식과 실제 날짜를 모두 확인한다', () => {
    expect(isValidDayKey('2026-11-12')).toBe(true);
    expect(isValidDayKey('2028-02-29')).toBe(true);
    expect(isValidDayKey('2026-02-29')).toBe(false);
    expect(isValidDayKey('2026-13-01')).toBe(false);
    expect(isValidDayKey('2026-11-00')).toBe(false);
    expect(isValidDayKey('2026-1-1')).toBe(false);
    expect(isValidDayKey('')).toBe(false);
  });
  it('잘못된 날짜는 parseDayKey에서 오류', () => {
    expect(() => parseDayKey('2026-02-30')).toThrow();
  });
});

describe('기타', () => {
  it('미래 날짜 판별', () => {
    expect(isFuture('2026-11-13', '2026-11-12')).toBe(true);
    expect(isFuture('2026-11-12', '2026-11-12')).toBe(false);
    expect(isFuture('2026-11-11', '2026-11-12')).toBe(false);
  });
  it('다음 자정까지 남은 시간', () => {
    useTZ('Asia/Seoul');
    expect(msUntilNextMidnight(new Date('2026-11-12T23:59:00+09:00'))).toBe(60_000);
    expect(msUntilNextMidnight(new Date('2026-11-12T00:00:00+09:00'))).toBe(24 * 3600_000);
  });
  it('화면 표시용 날짜', () => {
    expect(formatDayLabel('2026-11-12')).toBe('11월 12일 (목)');
  });
});
