/**
 * "지금 시각"을 한 곳에서 제공합니다.
 * 테스트에서는 setClock()으로 원하는 시각을 넣어 자정·월말·윤년 등을 검증합니다.
 */
export type Clock = () => Date;

const systemClock: Clock = () => new Date();
let current: Clock = systemClock;

export function now(): Date {
  return current();
}

export function setClock(clock: Clock): void {
  current = clock;
}

/** 고정된 시각을 돌려주는 시계 (테스트용) */
export function fixedClock(date: Date): Clock {
  const t = date.getTime();
  return () => new Date(t);
}

export function resetClock(): void {
  current = systemClock;
}
