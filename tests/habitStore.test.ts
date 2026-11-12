import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/core/db';
import { fixedClock, resetClock, setClock } from '../src/core/clock';
import {
  addHabit,
  countLogs,
  deleteHabit,
  getDayView,
  getRangeProgress,
  isChecked,
  listHabits,
  moveHabit,
  toggleCheck,
  updateHabit,
  HabitError,
} from '../src/core/habitStore';
import { exportBackup, importBackup, parseBackup, BackupError } from '../src/core/backup';

/** 서울 시간으로 시계를 맞춤 */
function at(iso: string) {
  setClock(fixedClock(new Date(`${iso}+09:00`)));
}

beforeEach(async () => {
  process.env.TZ = 'Asia/Seoul';
  await db.logs.clear();
  await db.habits.clear();
  at('2026-11-12T10:00:00');
});

afterEach(() => {
  vi.restoreAllMocks();
  resetClock();
});

async function expectCode(p: Promise<unknown>, code: HabitError['code']) {
  await expect(p).rejects.toMatchObject({ name: 'HabitError', code });
}

describe('습관 추가 (F-01)', () => {
  it('오늘부터 체크 대상, 순서는 뒤에 붙는다', async () => {
    const a = await addHabit({ name: ' 물 2L 마시기 ', emoji: '💧', colorIndex: 0 });
    const b = await addHabit({ name: '운동', colorIndex: 3 });
    expect(a.name).toBe('물 2L 마시기'); // 앞뒤 공백 제거
    expect(a.startDayKey).toBe('2026-11-12');
    expect(b.sortOrder).toBeGreaterThan(a.sortOrder);
    expect(b.emoji).toBeUndefined();
    expect((await listHabits()).map((h) => h.name)).toEqual(['물 2L 마시기', '운동']);
  });

  it('이름은 1~30자 (한글·이모지도 한 글자로 셈)', async () => {
    await expectCode(addHabit({ name: '   ', colorIndex: 0 }), 'NAME_EMPTY');
    await expectCode(addHabit({ name: '가'.repeat(31), colorIndex: 0 }), 'NAME_TOO_LONG');
    await expect(addHabit({ name: '가'.repeat(30), colorIndex: 0 })).resolves.toBeTruthy();
    await expect(addHabit({ name: '👍'.repeat(30), colorIndex: 0 })).resolves.toBeTruthy();
  });

  it('같은 이름 허용', async () => {
    await addHabit({ name: '독서', colorIndex: 0 });
    await addHabit({ name: '독서', colorIndex: 0 });
    expect(await listHabits()).toHaveLength(2);
  });

  it('아이콘은 이모지 1개, 색상은 0~7', async () => {
    await expectCode(addHabit({ name: 'a', emoji: '💧💧', colorIndex: 0 }), 'BAD_EMOJI');
    await expect(addHabit({ name: 'a', emoji: '👨‍👩‍👧', colorIndex: 0 })).resolves.toBeTruthy(); // 합성 이모지도 1개
    await expectCode(addHabit({ name: 'a', colorIndex: 8 }), 'BAD_COLOR');
    await expectCode(addHabit({ name: 'a', colorIndex: -1 }), 'BAD_COLOR');
    await expectCode(addHabit({ name: 'a', colorIndex: 1.5 }), 'BAD_COLOR');
  });
});

describe('습관 수정 · 순서 (F-02, F-04)', () => {
  it('수정해도 지난 기록은 그대로', async () => {
    const h = await addHabit({ name: '물', emoji: '💧', colorIndex: 0 });
    await toggleCheck(h.id, '2026-11-12');
    const u = await updateHabit(h.id, { name: '물 2L', colorIndex: 5 });
    expect(u.name).toBe('물 2L');
    expect(u.emoji).toBeUndefined();
    expect(u.startDayKey).toBe(h.startDayKey);
    expect(await isChecked(h.id, '2026-11-12')).toBe(true);
  });

  it('없는 습관 수정은 오류', async () => {
    await expectCode(updateHabit('nope', { name: 'x', colorIndex: 0 }), 'NOT_FOUND');
  });

  it('↑↓로 순서 바꾸기, 맨 끝에서는 그대로', async () => {
    const a = await addHabit({ name: 'A', colorIndex: 0 });
    const b = await addHabit({ name: 'B', colorIndex: 0 });
    const c = await addHabit({ name: 'C', colorIndex: 0 });
    await moveHabit(c.id, 'up');
    expect((await listHabits()).map((h) => h.name)).toEqual(['A', 'C', 'B']);
    await moveHabit(a.id, 'up'); // 이미 맨 위
    await moveHabit(b.id, 'down'); // 이미 맨 아래
    expect((await listHabits()).map((h) => h.name)).toEqual(['A', 'C', 'B']);
    await moveHabit(a.id, 'down');
    expect((await listHabits()).map((h) => h.name)).toEqual(['C', 'A', 'B']);
  });
});

describe('체크 (F-05, F-06)', () => {
  it('체크 → 해제 → 체크 해도 기록은 1개만', async () => {
    const h = await addHabit({ name: '물', colorIndex: 0 });
    expect(await toggleCheck(h.id, '2026-11-12')).toBe(true);
    expect(await toggleCheck(h.id, '2026-11-12')).toBe(false);
    expect(await toggleCheck(h.id, '2026-11-12')).toBe(true);
    expect(await countLogs(h.id)).toBe(1);
  });

  it('미래 날짜와 습관 추가 전 날짜는 체크 불가', async () => {
    const h = await addHabit({ name: '물', colorIndex: 0 });
    await expectCode(toggleCheck(h.id, '2026-11-13'), 'FUTURE_DAY');
    await expectCode(toggleCheck(h.id, '2026-11-11'), 'BEFORE_START');
    await expectCode(toggleCheck(h.id, '2026-02-30'), 'BAD_DAY');
  });

  it('지난 날짜는 기간 제한 없이 체크 · 수정 가능', async () => {
    at('2025-01-01T09:00:00');
    const h = await addHabit({ name: '물', colorIndex: 0 });
    at('2026-11-12T10:00:00');
    expect(await toggleCheck(h.id, '2025-01-01')).toBe(true);
    expect(await toggleCheck(h.id, '2025-06-15')).toBe(true);
  });

  it('자정이 지나면 오늘 화면은 빈 체크, 어제 기록은 그대로 (매일 리셋)', async () => {
    const h = await addHabit({ name: '물', colorIndex: 0 });
    at('2026-11-12T23:59:00');
    await toggleCheck(h.id, '2026-11-12');
    expect((await getDayView('2026-11-12')).habits[0].checked).toBe(true);

    at('2026-11-13T00:00:00');
    const today = await getDayView('2026-11-13');
    expect(today.habits[0].checked).toBe(false);
    expect(today.progress).toMatchObject({ done: 0, total: 1 });
    expect(today.habits[0].streak).toBe(1); // 어제까지 1일 연속은 유지
    expect((await getDayView('2026-11-12')).habits[0].checked).toBe(true);
  });

  it('습관을 추가하기 전 날짜에는 그 습관이 안 보인다', async () => {
    at('2026-11-10T09:00:00');
    await addHabit({ name: '먼저', colorIndex: 0 });
    at('2026-11-12T09:00:00');
    await addHabit({ name: '나중', colorIndex: 0 });
    expect((await getDayView('2026-11-11')).habits.map((h) => h.name)).toEqual(['먼저']);
    expect((await getDayView('2026-11-12')).habits.map((h) => h.name)).toEqual(['먼저', '나중']);
  });
});

describe('달성률 · 연속 달성일 (F-07, F-09)', () => {
  it('"3 / 5 완료"와 습관별 연속 일수', async () => {
    at('2026-11-10T09:00:00');
    const hs = [];
    for (const n of ['A', 'B', 'C', 'D', 'E']) hs.push(await addHabit({ name: n, colorIndex: 0 }));
    at('2026-11-12T20:00:00');
    for (const d of ['2026-11-10', '2026-11-11']) await toggleCheck(hs[0].id, d);
    for (const h of hs.slice(0, 3)) await toggleCheck(h.id, '2026-11-12');

    const v = await getDayView('2026-11-12');
    expect(v.progress).toEqual({ done: 3, total: 5, rate: 0.6 });
    expect(v.habits.map((h) => h.streak)).toEqual([3, 1, 1, 0, 0]);
  });

  it('습관이 0개면 달성률 없음', async () => {
    const v = await getDayView('2026-11-12');
    expect(v.habits).toEqual([]);
    expect(v.progress).toEqual({ done: 0, total: 0, rate: null });
  });
});

describe('습관 완전 삭제 (F-03)', () => {
  async function setup() {
    at('2026-11-01T09:00:00');
    const hs = [];
    for (const n of ['A', 'B', 'C', 'D', 'E']) hs.push(await addHabit({ name: n, colorIndex: 0 }));
    at('2026-11-12T10:00:00');
    // 11월 5일: A, B, C 체크 → 3/5
    for (const h of hs.slice(0, 3)) await toggleCheck(h.id, '2026-11-05');
    // E는 체크 기록이 3개
    for (const d of ['2026-11-05', '2026-11-06', '2026-11-07']) await toggleCheck(hs[4].id, d);
    return hs;
  }

  it('확인 창에 보여 줄 기록 수가 실제와 같다', async () => {
    const hs = await setup();
    expect(await countLogs(hs[4].id)).toBe(3);
    expect(await countLogs(hs[3].id)).toBe(0);
  });

  it('habits와 logs 모두에서 사라지고, 다른 습관 기록은 그대로', async () => {
    const hs = await setup();
    await deleteHabit(hs[0].id);
    expect(await db.habits.get(hs[0].id)).toBeUndefined();
    expect(await db.logs.where('habitId').equals(hs[0].id).count()).toBe(0);
    expect(await countLogs(hs[4].id)).toBe(3);
    expect(await isChecked(hs[1].id, '2026-11-05')).toBe(true);
  });

  it('지난 날짜 목록에서도 빠지고 달성률이 다시 계산된다 (3/5 → 3/4 또는 2/4)', async () => {
    const hs = await setup();
    // 11월 5일: A,B,C,E 체크 → 4/5
    expect((await getDayView('2026-11-05')).progress).toMatchObject({ done: 4, total: 5 });

    await deleteHabit(hs[3].id); // 체크 안 된 D 삭제 → 4/4
    let v = await getDayView('2026-11-05');
    expect(v.habits.map((h) => h.name)).toEqual(['A', 'B', 'C', 'E']);
    expect(v.progress).toMatchObject({ done: 4, total: 4 });

    await deleteHabit(hs[0].id); // 체크된 A 삭제 → 3/3
    v = await getDayView('2026-11-05');
    expect(v.progress).toMatchObject({ done: 3, total: 3 });

    const range = await getRangeProgress('2026-11-05', '2026-11-07');
    expect(range.get('2026-11-06')).toMatchObject({ done: 1, total: 3 });
  });

  it('삭제 도중 실패하면 습관과 기록이 둘 다 그대로 남는다', async () => {
    const hs = await setup();
    vi.spyOn(db.habits, 'delete').mockImplementationOnce(() => {
      throw new Error('강제 실패');
    });
    await expect(deleteHabit(hs[4].id)).rejects.toThrow('강제 실패');
    expect(await db.habits.get(hs[4].id)).toBeTruthy();
    expect(await countLogs(hs[4].id)).toBe(3);
  });

  it('모두 삭제하면 0개 상태로 돌아간다', async () => {
    const hs = await setup();
    for (const h of hs) await deleteHabit(h.id);
    expect(await db.habits.count()).toBe(0);
    expect(await db.logs.count()).toBe(0);
    expect((await getDayView('2026-11-12')).habits).toEqual([]);
  });
});

describe('백업 내보내기 · 가져오기', () => {
  it('내보내기 → 가져오기 하면 내용이 같다 (합치지 않고 통째로 교체)', async () => {
    const a = await addHabit({ name: '물', emoji: '💧', colorIndex: 1 });
    const b = await addHabit({ name: '운동', colorIndex: 2 });
    await toggleCheck(a.id, '2026-11-12');
    await toggleCheck(b.id, '2026-11-12');
    const backup = await exportBackup();
    const text = JSON.stringify(backup);

    // 백업 뒤에 데이터가 바뀌어도
    await deleteHabit(a.id);
    await addHabit({ name: '새 습관', colorIndex: 0 });

    await importBackup(parseBackup(text));
    const again = await exportBackup();
    expect(again.habits).toEqual(backup.habits);
    expect(again.logs.sort((x, y) => x.habitId.localeCompare(y.habitId))).toEqual(
      backup.logs.sort((x, y) => x.habitId.localeCompare(y.habitId)),
    );
  });

  it('잘못된 파일은 거부하고 기존 데이터는 그대로', async () => {
    await addHabit({ name: '물', colorIndex: 1 });
    const bad = [
      'not json',
      '{}',
      JSON.stringify({ version: 2, habits: [], logs: [] }),
      JSON.stringify({ version: 1, habits: [{ id: 'x' }], logs: [] }),
      JSON.stringify({ version: 1, habits: [], logs: [{ habitId: 'ghost', dayKey: '2026-11-12', checkedAt: 1 }] }),
    ];
    for (const t of bad) expect(() => parseBackup(t)).toThrow(BackupError);
    expect(await db.habits.count()).toBe(1);
  });
});
