/**
 * 백업 내보내기 · 가져오기 — 계획서 4장
 * 형식: { version: 1, exportedAt, habits: [...], logs: [...] } JSON 파일 하나.
 * 가져오기는 현재 기록과 합치지 않고 통째로 바꿉니다. (확인 창은 화면에서 띄움)
 */
import { db, type Habit, type HabitLog } from './db';
import { now } from './clock';
import { isValidDayKey } from './dayKey';
import { COLOR_COUNT, NAME_MAX, countChars } from './habitStore';

export const BACKUP_VERSION = 1;

export interface BackupFile {
  version: 1;
  exportedAt: number;
  habits: Habit[];
  logs: HabitLog[];
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export async function exportBackup(): Promise<BackupFile> {
  return db.transaction('r', db.habits, db.logs, async () => ({
    version: BACKUP_VERSION,
    exportedAt: now().getTime(),
    habits: await db.habits.orderBy('sortOrder').toArray(),
    logs: await db.logs.toArray(),
  }));
}

/** 파일 이름 예: myhabit-backup-2026-11-12.json */
export function backupFileName(dayKey: string): string {
  return `myhabit-backup-${dayKey}.json`;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function fail(msg: string): never {
  throw new BackupError(`백업 파일을 읽을 수 없어요: ${msg}`);
}

/** 파일 내용을 검사해서 안전한 BackupFile로 바꿈. 이상하면 BackupError */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    fail('JSON 형식이 아니에요.');
  }
  if (!isObj(data)) fail('내용이 비어 있어요.');
  if (data.version !== BACKUP_VERSION) fail(`지원하지 않는 버전(${String(data.version)})이에요.`);
  if (!Array.isArray(data.habits) || !Array.isArray(data.logs)) fail('습관 또는 기록 목록이 없어요.');

  const habits: Habit[] = data.habits.map((h, i) => {
    if (!isObj(h)) fail(`${i + 1}번째 습관이 올바르지 않아요.`);
    const { id, name, emoji, colorIndex, sortOrder, startDayKey, createdAt, updatedAt } = h;
    if (typeof id !== 'string' || id === '') fail(`${i + 1}번째 습관의 id가 없어요.`);
    if (typeof name !== 'string' || name.trim() === '' || countChars(name) > NAME_MAX)
      fail(`${i + 1}번째 습관의 이름이 올바르지 않아요.`);
    if (emoji !== undefined && typeof emoji !== 'string') fail(`${i + 1}번째 습관의 아이콘이 올바르지 않아요.`);
    if (typeof colorIndex !== 'number' || !Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex >= COLOR_COUNT)
      fail(`${i + 1}번째 습관의 색상이 올바르지 않아요.`);
    if (typeof sortOrder !== 'number' || !Number.isFinite(sortOrder)) fail(`${i + 1}번째 습관의 순서가 올바르지 않아요.`);
    if (typeof startDayKey !== 'string' || !isValidDayKey(startDayKey))
      fail(`${i + 1}번째 습관의 시작 날짜가 올바르지 않아요.`);
    if (typeof createdAt !== 'number' || typeof updatedAt !== 'number')
      fail(`${i + 1}번째 습관의 시각 정보가 올바르지 않아요.`);
    return {
      id,
      name,
      ...(emoji ? { emoji } : {}),
      colorIndex,
      sortOrder,
      startDayKey,
      createdAt,
      updatedAt,
    };
  });

  const ids = new Set(habits.map((h) => h.id));
  if (ids.size !== habits.length) fail('같은 id의 습관이 두 번 들어 있어요.');

  const logs: HabitLog[] = data.logs.map((l, i) => {
    if (!isObj(l)) fail(`${i + 1}번째 기록이 올바르지 않아요.`);
    const { habitId, dayKey, checkedAt } = l;
    if (typeof habitId !== 'string' || !ids.has(habitId)) fail(`${i + 1}번째 기록의 습관을 찾을 수 없어요.`);
    if (typeof dayKey !== 'string' || !isValidDayKey(dayKey)) fail(`${i + 1}번째 기록의 날짜가 올바르지 않아요.`);
    if (typeof checkedAt !== 'number') fail(`${i + 1}번째 기록의 시각이 올바르지 않아요.`);
    return { habitId, dayKey, checkedAt };
  });

  return { version: BACKUP_VERSION, exportedAt: Number(data.exportedAt) || 0, habits, logs };
}

/** 현재 데이터를 백업 내용으로 통째로 교체 (한 트랜잭션: 실패하면 기존 데이터 유지) */
export async function importBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', db.habits, db.logs, async () => {
    await db.logs.clear();
    await db.habits.clear();
    await db.habits.bulkAdd(backup.habits);
    await db.logs.bulkPut(backup.logs); // 같은 습관·날짜가 겹쳐 있으면 하나로
  });
}
