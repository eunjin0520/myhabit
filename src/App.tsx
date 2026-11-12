/**
 * 앱 뼈대: 하단 탭 3개(오늘 · 기록 · 습관) + 추가/수정 창 + 삭제 확인 창 + 안내 메시지
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from './components/Dialog';
import { Toast, type ToastMessage } from './components/Toast';
import { countLogs, deleteHabit } from './core/habitStore';
import type { Habit } from './core/db';
import type { DayKey } from './core/dayKey';
import { useToday } from './hooks/useToday';
import { TodayPage } from './features/today/TodayPage';
import { HistoryPage } from './features/history/HistoryPage';
import { HabitsPage } from './features/habits/HabitsPage';
import { EDITOR_TITLE_ID, HabitEditor } from './features/habits/HabitEditor';
import { DELETE_DESC_ID, DELETE_TITLE_ID, DeleteConfirm } from './features/habits/DeleteConfirm';
import styles from './App.module.css';

type Tab = 'today' | 'history' | 'habits';
type EditorState = { mode: 'add' } | { mode: 'edit'; habit: Habit } | null;

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'today', label: '오늘', icon: 'M5 12.5l4.5 4.5L19 7.5' },
  { id: 'history', label: '기록', icon: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4' },
  { id: 'habits', label: '습관', icon: 'M4 6h16M4 12h16M4 18h16' },
];

export function App() {
  const today = useToday();
  const [tab, setTab] = useState<Tab>('today');
  const [day, setDay] = useState<DayKey>(today);
  const [editor, setEditor] = useState<EditorState>(null);
  const [confirm, setConfirm] = useState<{ habit: Habit; count: number } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // 자정이 지나면: 오늘을 보고 있었다면 새 오늘로 이동 (지난 날을 보고 있었다면 그대로)
  const prevToday = useRef(today);
  useEffect(() => {
    if (prevToday.current === today) return;
    const old = prevToday.current;
    prevToday.current = today;
    setDay((d) => (d === old ? today : d));
  }, [today]);

  const showToast = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  const clearToast = useCallback(() => setToast(null), []);

  async function requestDelete(habit: Habit) {
    const count = await countLogs(habit.id); // 삭제 전에 기록 수를 세어 둠
    setConfirm({ habit, count });
  }

  async function confirmDelete() {
    if (!confirm) return;
    try {
      await deleteHabit(confirm.habit.id);
      setConfirm(null);
      setEditor(null);
      setTab('habits');
      showToast('습관을 삭제했어요');
    } catch {
      setConfirm(null);
      showToast('삭제하지 못했어요. 다시 시도해 주세요.');
    }
  }

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        {tab === 'today' && (
          <TodayPage
            day={day}
            today={today}
            onChangeDay={setDay}
            onAddHabit={() => setEditor({ mode: 'add' })}
            onError={showToast}
          />
        )}
        {tab === 'history' && <HistoryPage />}
        {tab === 'habits' && (
          <HabitsPage
            onAdd={() => setEditor({ mode: 'add' })}
            onEdit={(habit) => setEditor({ mode: 'edit', habit })}
          />
        )}
      </main>

      <nav className={styles.tabbar} aria-label="메뉴">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => {
              setTab(t.id);
              if (t.id === 'today' && tab === 'today') setDay(today); // 오늘 탭을 한 번 더 누르면 오늘로
            }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d={t.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <Dialog open={editor !== null} onClose={() => setEditor(null)} variant="sheet" labelledBy={EDITOR_TITLE_ID}>
        {editor && (
          <HabitEditor
            key={editor.mode === 'edit' ? editor.habit.id : 'new'}
            habit={editor.mode === 'edit' ? editor.habit : undefined}
            onClose={() => setEditor(null)}
            onRequestDelete={(h) => void requestDelete(h)}
          />
        )}
      </Dialog>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        variant="alert"
        labelledBy={DELETE_TITLE_ID}
        describedBy={DELETE_DESC_ID}
      >
        {confirm && (
          <DeleteConfirm
            name={confirm.habit.name}
            logCount={confirm.count}
            onCancel={() => setConfirm(null)}
            onConfirm={confirmDelete}
          />
        )}
      </Dialog>

      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
