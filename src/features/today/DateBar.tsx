/**
 * 상단 ‹ 날짜 › 이동 바 (F-06)
 * - ‹ › 버튼으로 하루 이동 (아이폰 가장자리 스와이프는 "뒤로 가기"와 겹쳐서 쓰지 않음)
 * - 날짜를 누르면 달력에서 선택 (휴대폰 기본 날짜 선택기)
 * - 미래로는 이동 불가, 오늘이 아니면 "오늘" 버튼
 */
import { addDays, formatDayLabel, isValidDayKey, type DayKey } from '../../core/dayKey';
import styles from './today.module.css';

interface Props {
  day: DayKey;
  today: DayKey;
  onChange: (day: DayKey) => void;
}

export function DateBar({ day, today, onChange }: Props) {
  const isToday = day === today;
  return (
    <div className={styles.dateBar}>
      <button className={styles.navBtn} onClick={() => onChange(addDays(day, -1))} aria-label="이전 날">
        ‹
      </button>

      <label className={styles.dateLabel}>
        <span>{isToday ? `오늘 · ${formatDayLabel(day)}` : formatDayLabel(day)}</span>
        <input
          type="date"
          className={styles.dateInput}
          value={day}
          max={today}
          aria-label="날짜 선택"
          onChange={(e) => {
            const v = e.target.value;
            if (isValidDayKey(v)) onChange(v > today ? today : v);
          }}
        />
      </label>

      <button
        className={styles.navBtn}
        onClick={() => onChange(addDays(day, 1))}
        disabled={day >= today}
        aria-label="다음 날"
      >
        ›
      </button>

      {!isToday && (
        <button className={styles.todayBtn} onClick={() => onChange(today)}>
          오늘
        </button>
      )}
    </div>
  );
}
