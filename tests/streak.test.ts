import { describe, expect, it } from 'vitest';
import { computeStreak } from '../src/core/streak';

const today = '2026-11-12';

describe('연속 달성일', () => {
  it('기록이 없으면 0', () => {
    expect(computeStreak(new Set(), today)).toBe(0);
  });

  it('오늘 체크했으면 오늘부터 센다', () => {
    expect(computeStreak(new Set(['2026-11-12', '2026-11-11', '2026-11-10']), today)).toBe(3);
  });

  it('오늘 아직 안 했으면 어제부터 센다 (0이 되지 않음)', () => {
    expect(computeStreak(new Set(['2026-11-11', '2026-11-10']), today)).toBe(2);
  });

  it('어제도 안 했으면 0', () => {
    expect(computeStreak(new Set(['2026-11-10', '2026-11-09']), today)).toBe(0);
  });

  it('첫 빈 날에서 멈춘다', () => {
    expect(computeStreak(new Set(['2026-11-12', '2026-11-11', '2026-11-09', '2026-11-08']), today)).toBe(2);
  });

  it('월·연 경계를 넘어 센다', () => {
    const days = new Set(['2027-01-02', '2027-01-01', '2026-12-31', '2026-12-30']);
    expect(computeStreak(days, '2027-01-02')).toBe(4);
  });

  it('윤년 2월 29일을 건너뛰지 않는다', () => {
    const days = new Set(['2028-03-01', '2028-02-29', '2028-02-28']);
    expect(computeStreak(days, '2028-03-01')).toBe(3);
  });
});
