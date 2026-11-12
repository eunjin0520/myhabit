/**
 * 모든 화면은 이 파일의 함수로만 데이터를 바꿉니다. — 계획서 3장
 * 추가 · 수정 · 삭제(기록 포함 완전 삭제) · 순서 변경 · 체크 토글 · 조회
 */
import { db, type Habit, type HabitLog } from './db';
import { now } from './clock';
import { addDays, isFuture, isValidDayKey, todayKey, type DayKey } from './dayKey';
import { computeStreak } from './streak';
import { dayProgress, habitsVisibleOn, type DayProgress } from './progress';

export const NAME_MAX = 30;
export const COLOR_COUNT = 8;

export class HabitError extends Error {
  constructor(
    public readonly code:
      | 'NAME_EMPTY'
      | 'NAME_TOO_LONG'
      | 'BAD_EMOJI'
      | 'BAD_COLOR'
      | 'NOT_FOUND'
      | 'FUTURE_DAY'
      | 'BEFORE_START'
      | 'BAD_DAY',
    message: string,
  ) {
    super(message);
    this.name = 'HabitError';
  }
}

export interface HabitInput {
  name: string;
  emoji?: string;
  colorIndex: number;
}

// ---------- 입력 검사 ----------

/** 이모지·한글이 섞여도 사람이 보는 글자 수로 셈 */
export function countChars(text: string): number {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const seg = new Intl.Segmenter('ko', { granularity: 'grapheme' });
    let n = 0;
    for (const _ of seg.segment(text)) n += 1;
    return n;
  }
  return Array.from(text).length;
}

function cleanInput(input: HabitInput): HabitInput {
  const name = input.name.trim();
  if (name.length === 0) throw new HabitError('NAME_EMPTY', '습관 이름을 입력해 주세요.');
  if (countChars(name) > NAME_MAX)
    throw new HabitError('NAME_TOO_LONG', `습관 이름은 ${NAME_MAX}자까지 쓸 수 있어요.`);

  const emoji = input.emoji?.trim() || undefined;
  if (emoji !== undefined && countChars(emoji) !== 1)
    throw new HabitError('BAD_EMOJI', '아이콘은 이모지 1개만 고를 수 있어요.');

  if (!Number.isInteger(input.colorIndex) || input.colorIndex < 0 || input.colorIndex >= COLOR_COUNT)
    throw new HabitError('BAD_COLOR', '색상을 다시 골라 주세요.');

  return { name, emoji, colorIndex: input.colorIndex };
}

// ---------- 습관 조회 ----------

/** 모든 습관, 표시 순서대로 */
export async function listHabits(): Promise<Habit[]> {
  return db.habits.orderBy('sortOrder').toArray();
}

export async function getHabit(id: string): Promise<Habit | undefined> {
  return db.habits.get(id);
}

// ---------- 추가 · 수정 · 삭제 ----------

/** F-01 습관 추가: 추가한 날(오늘)부터 체크 대상 */
export async function addHabit(input: HabitInput): Promise<Habit> {
  const clean = cleanInput(input);
  return db.transaction('rw', db.habits, async () => {
    const last = await db.habits.orderBy('sortOrder').last();
    const t = now().getTime();
    const habit: Habit = {
      id: crypto.randomUUID(),
      name: clean.name,
      ...(clean.emoji ? { emoji: clean.emoji } : {}),
      colorIndex: clean.colorIndex,
      sortOrder: last ? last.sortOrder + 1 : 0,
      startDayKey: todayKey(),
      createdAt: t,
      updatedAt: t,
    };
    await db.habits.add(habit);
    return habit;
  });
}

/** F-02 습관 수정: 이름·아이콘·색상만 바뀌고 지난 기록은 그대로 */
export async function updateHabit(id: string, input: HabitInput): Promise<Habit> {
  const clean = cleanInput(input);
  return db.transaction('rw', db.habits, async () => {
    const habit = await db.habits.get(id);
    if (!habit) throw new HabitError('NOT_FOUND', '습관을 찾을 수 없어요.');
    const updated: Habit = {
      ...habit,
      name: clean.name,
      colorIndex: clean.colorIndex,
      updatedAt: now().getTime(),
    };
    if (clean.emoji) updated.emoji = clean.emoji;
    else delete updated.emoji;
    await db.habits.put(updated);
    return updated;
  });
}

/** 삭제 확인 창에 보여 줄 기록 수 (삭제 전에 셈) */
export async function countLogs(habitId: string): Promise<number> {
  return db.logs.where('habitId').equals(habitId).count();
}

/**
 * F-03 습관 완전 삭제: 습관 + 그 습관의 기록 전체를 한 트랜잭션으로.
 * 중간에 실패하면 둘 다 그대로 남습니다.
 */
export async function deleteHabit(habitId: string): Promise<void> {
  await db.transaction('rw', db.habits, db.logs, async () => {
    await db.logs.where('habitId').equals(habitId).delete();
    await db.habits.delete(habitId);
  });
}

/** F-04 순서 변경: 위(-1) 또는 아래(+1) 습관과 자리 바꾸기 */
export async function moveHabit(habitId: string, direction: 'up' | 'down'): Promise<void> {
  await db.transaction('rw', db.habits, async () => {
    const habits = await db.habits.orderBy('sortOrder').toArray();
    const i = habits.findIndex((h) => h.id === habitId);
    if (i < 0) throw new HabitError('NOT_FOUND', '습관을 찾을 수 없어요.');
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= habits.length) return; // 이미 맨 위/맨 아래
    [habits[i], habits[j]] = [habits[j], habits[i]];
    // 0,1,2…로 다시 매겨서 순서 번호가 꼬이지 않게 함
    await db.habits.bulkPut(habits.map((h, idx) => ({ ...h, sortOrder: idx })));
  });
}

// ---------- 체크 ----------

/**
 * F-05/F-06 체크 토글: 기록이 없으면 만들고(체크), 있으면 지움(해제).
 * 미래 날짜와 습관을 추가하기 전 날짜는 막습니다.
 * @returns 토글 후 체크 상태
 */
export async function toggleCheck(habitId: string, day: DayKey): Promise<boolean> {
  if (!isValidDayKey(day)) throw new HabitError('BAD_DAY', '날짜가 올바르지 않아요.');
  if (isFuture(day)) throw new HabitError('FUTURE_DAY', '미래 날짜는 체크할 수 없어요.');

  return db.transaction('rw', db.habits, db.logs, async () => {
    const habit = await db.habits.get(habitId);
    if (!habit) throw new HabitError('NOT_FOUND', '습관을 찾을 수 없어요.');
    if (day < habit.startDayKey)
      throw new HabitError('BEFORE_START', '습관을 추가하기 전 날짜는 체크할 수 없어요.');

    const key: [string, string] = [habitId, day];
    const existing = await db.logs.get(key);
    if (existing) {
      await db.logs.delete(key);
      return false;
    }
    await db.logs.add({ habitId, dayKey: day, checkedAt: now().getTime() });
    return true;
  });
}

export async function isChecked(habitId: string, day: DayKey): Promise<boolean> {
  return (await db.logs.get([habitId, day])) !== undefined;
}

// ---------- 화면용 조회 ----------

export interface DayView {
  day: DayKey;
  habits: Array<Habit & { checked: boolean; streak: number }>;
  progress: DayProgress;
}

/** 오늘 화면(①)에 필요한 것 한 번에: 그날 보일 습관 + 체크 여부 + 연속 달성일 + 달성률 */
export async function getDayView(day: DayKey): Promise<DayView> {
  return db.transaction('r', db.habits, db.logs, async () => {
    const all = await db.habits.toArray();
    const visible = habitsVisibleOn(all, day);
    const dayLogs = await db.logs.where('dayKey').equals(day).toArray();
    const checkedIds = new Set(dayLogs.map((l) => l.habitId));
    const today = todayKey();

    const habits = await Promise.all(
      visible.map(async (h) => {
        const logs = await db.logs.where('habitId').equals(h.id).toArray();
        const days = new Set(logs.map((l) => l.dayKey));
        return { ...h, checked: checkedIds.has(h.id), streak: computeStreak(days, today) };
      }),
    );
    return { day, habits, progress: dayProgress(all, checkedIds, day) };
  });
}

/** 기록 달력(②)용: 기간 안 날짜별 달성률 (from~to 포함) */
export async function getRangeProgress(
  from: DayKey,
  to: DayKey,
): Promise<Map<DayKey, DayProgress>> {
  return db.transaction('r', db.habits, db.logs, async () => {
    const all = await db.habits.toArray();
    const logs: HabitLog[] = await db.logs.where('dayKey').between(from, to, true, true).toArray();
    const byDay = new Map<DayKey, Set<string>>();
    for (const l of logs) {
      if (!byDay.has(l.dayKey)) byDay.set(l.dayKey, new Set());
      byDay.get(l.dayKey)!.add(l.habitId);
    }
    const result = new Map<DayKey, DayProgress>();
    // from~to 사이 날짜를 하나씩
    for (let d = from; d <= to; d = addDays(d, 1)) {
      result.set(d, dayProgress(all, byDay.get(d) ?? new Set(), d));
    }
    return result;
  });
}
