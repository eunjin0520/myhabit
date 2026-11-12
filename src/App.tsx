/**
 * 1단계 확인용 임시 화면입니다.
 * 데이터·날짜 로직이 실제 브라우저(IndexedDB)에서 동작하는지 눌러 보는 용도이고,
 * 2단계에서 계획서 6장의 정식 화면(오늘 · 기록 · 습관 탭)으로 교체합니다.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { addDays, formatDayLabel, todayKey } from './core/dayKey';
import {
  addHabit,
  countLogs,
  deleteHabit,
  getDayView,
  toggleCheck,
  type DayView,
} from './core/habitStore';

export function App() {
  const [day, setDay] = useState(todayKey());
  const [view, setView] = useState<DayView | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const reload = useCallback(async () => setView(await getDayView(day)), [day]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const today = todayKey();

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function onAdd(e: FormEvent) {
    e.preventDefault();
    const value = name;
    setName(''); // 저장이 끝나기 전에 바로 비워서, 빠르게 두 번 입력해도 이름이 이어 붙지 않게
    void run(() => addHabit({ name: value, colorIndex: 0 }));
  }

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <p style={{ fontSize: 12, color: '#888' }}>1단계 확인용 임시 화면</p>
      <h1 style={{ fontSize: 22 }}>마이해빗</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setDay(addDays(day, -1))} aria-label="이전 날">‹</button>
        <strong>{formatDayLabel(day)}</strong>
        <button onClick={() => setDay(addDays(day, 1))} disabled={day >= today} aria-label="다음 날">›</button>
        {day !== today && <button onClick={() => setDay(today)}>오늘</button>}
      </div>

      {view && (
        <p>
          {view.progress.total === 0
            ? '첫 습관을 추가해 보세요'
            : `${view.progress.done} / ${view.progress.total} 완료`}
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {view?.habits.map((h) => (
          <li key={h.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0' }}>
            <button
              onClick={() => void run(() => toggleCheck(h.id, day))}
              aria-label={`${h.name}, ${h.checked ? '완료' : '미완료'}`}
              style={{ flex: 1, textAlign: 'left', padding: 10, opacity: h.checked ? 0.6 : 1 }}
            >
              {h.checked ? '●' : '○'} {h.name} · 연속 {h.streak}일
            </button>
            <button
              onClick={() =>
                void run(async () => {
                  const n = await countLogs(h.id);
                  if (confirm(`"${h.name}" 습관을 삭제할까요? 체크 기록 ${n}개도 함께 지워져요.`))
                    await deleteHabit(h.id);
                })
              }
            >
              삭제
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={onAdd} style={{ display: 'flex', gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="습관 이름" style={{ flex: 1 }} />
        <button disabled={name.trim() === ''}>추가</button>
      </form>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </main>
  );
}
