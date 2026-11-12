/** ③ 습관 관리 (탭 3): 목록 + "+ 습관 추가", 행 탭 = 수정, ↑↓ = 순서 변경 (F-04) */
import type { CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listHabits, moveHabit } from '../../core/habitStore';
import { habitColor } from '../../core/colors';
import type { Habit } from '../../core/db';
import styles from './habits.module.css';

interface Props {
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
}

export function HabitsPage({ onAdd, onEdit }: Props) {
  const habits = useLiveQuery(listHabits, []);

  return (
    <section className={styles.page} aria-labelledby="habits-title">
      <header className={styles.header}>
        <h1 id="habits-title" className={styles.title}>
          습관
        </h1>
      </header>

      {habits && habits.length === 0 && <p className={styles.empty}>아직 습관이 없어요.</p>}

      {habits && habits.length > 0 && (
        <ul className={styles.list}>
          {habits.map((h, i) => (
            <li key={h.id} className={styles.row} style={{ '--c': habitColor(h.colorIndex) } as CSSProperties}>
              <button className={styles.rowMain} onClick={() => onEdit(h)} aria-label={`${h.name} 수정`}>
                <span className={styles.emoji} aria-hidden="true">
                  {h.emoji ?? '•'}
                </span>
                <span className={styles.name}>{h.name}</span>
              </button>
              <button
                className={styles.moveBtn}
                onClick={() => void moveHabit(h.id, 'up')}
                disabled={i === 0}
                aria-label={`${h.name} 위로`}
              >
                ↑
              </button>
              <button
                className={styles.moveBtn}
                onClick={() => void moveHabit(h.id, 'down')}
                disabled={i === habits.length - 1}
                aria-label={`${h.name} 아래로`}
              >
                ↓
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className={styles.addBtn} onClick={onAdd}>
        + 습관 추가
      </button>
    </section>
  );
}
