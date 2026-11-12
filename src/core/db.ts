/**
 * 브라우저 내장 DB(IndexedDB) 정의 — 계획서 4장
 * habits(습관) 1개에 logs(체크 기록) 여러 개. 체크한 날만 기록 행이 생깁니다.
 * DB 구조를 바꿀 때는 version 번호를 올리고 upgrade로 기존 기록을 옮깁니다.
 */
import Dexie, { type Table } from 'dexie';

export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  colorIndex: number;
  sortOrder: number;
  startDayKey: string;
  createdAt: number;
  updatedAt: number;
}

export interface HabitLog {
  habitId: string;
  dayKey: string;
  checkedAt: number;
}

export class HabitDB extends Dexie {
  habits!: Table<Habit, string>;
  logs!: Table<HabitLog, [string, string]>;

  constructor(name = 'my-habit') {
    super(name);
    this.version(1).stores({
      habits: 'id, sortOrder',
      // 기본 키 [habitId+dayKey]: 같은 습관·같은 날 기록이 두 개 생기지 않음
      logs: '[habitId+dayKey], habitId, dayKey',
    });
  }
}

export const db = new HabitDB();
