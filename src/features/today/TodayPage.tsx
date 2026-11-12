/** ① 오늘 화면 (탭 1, 첫 화면) */
import { useLiveQuery } from 'dexie-react-hooks';
import { getDayView, toggleCheck } from '../../core/habitStore';
import type { DayKey } from '../../core/dayKey';
import { DateBar } from './DateBar';
import { HabitRow } from './HabitRow';
import { ProgressRing } from './ProgressRing';
import styles from './today.module.css';

interface Props {
  day: DayKey;
  today: DayKey;
  onChangeDay: (day: DayKey) => void;
  onAddHabit: () => void;
  onError: (message: string) => void;
}

export function TodayPage({ day, today, onChangeDay, onAddHabit, onError }: Props) {
  // DB가 바뀌면 자동으로 다시 읽음. today를 넣은 이유: 자정이 지나면 연속 달성일 기준이 바뀜
  const view = useLiveQuery(() => getDayView(day), [day, today]);

  return (
    <section className={styles.page} aria-labelledby="today-title">
      <h1 id="today-title" className="visually-hidden">
        오늘
      </h1>
      <header className={styles.header}>
        <DateBar day={day} today={today} onChange={onChangeDay} />
        {view && view.progress.total > 0 && (
          <ProgressRing done={view.progress.done} total={view.progress.total} />
        )}
      </header>

      {view && view.habits.length === 0 && (
        <div className={styles.empty}>
          {day === today ? (
            <>
              <p className={styles.emptyTitle}>첫 습관을 추가해 보세요</p>
              <p className={styles.emptyText}>매일 하고 싶은 일을 등록하고, 한 번 탭해서 체크해요.</p>
              <button className={styles.primaryBtn} onClick={onAddHabit}>
                + 습관 추가
              </button>
            </>
          ) : (
            <p className={styles.emptyText}>이 날에는 체크할 습관이 없어요.</p>
          )}
        </div>
      )}

      {view && view.habits.length > 0 && (
        <ul className={styles.list}>
          {view.habits.map((h) => (
            <HabitRow
              key={h.id}
              name={h.name}
              emoji={h.emoji}
              colorIndex={h.colorIndex}
              checked={h.checked}
              streak={h.streak}
              onToggle={async () => {
                try {
                  return await toggleCheck(h.id, day);
                } catch (e) {
                  onError(e instanceof Error ? e.message : '체크하지 못했어요.');
                  return h.checked;
                }
              }}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
