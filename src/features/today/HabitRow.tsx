/**
 * 습관 한 줄 (F-05): 탭하면 체크, 다시 탭하면 해제.
 * 체크된 습관은 색이 채워진 원 + 이름 연하게. 체크할 때 짧은 애니메이션(안드로이드는 진동도).
 * 화면 낭독기는 "물 2L 마시기, 완료"로 읽음.
 */
import { useState, type CSSProperties } from 'react';
import { habitColor } from '../../core/colors';
import styles from './today.module.css';

interface Props {
  name: string;
  emoji?: string;
  colorIndex: number;
  checked: boolean;
  streak: number;
  onToggle: () => Promise<boolean>;
}

export function HabitRow({ name, emoji, colorIndex, checked, streak, onToggle }: Props) {
  const [pop, setPop] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return; // 빠른 연타로 두 번 처리되지 않게
    setBusy(true);
    try {
      const nowChecked = await onToggle();
      if (nowChecked) {
        setPop(true);
        navigator.vibrate?.(12); // 안드로이드만 동작 (아이폰 Safari는 지원 안 함)
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <button
        className={`${styles.row} ${checked ? styles.rowChecked : ''}`}
        style={{ '--c': habitColor(colorIndex) } as CSSProperties}
        onClick={handleClick}
        aria-label={`${name}, ${checked ? '완료' : '미완료'}${streak > 0 ? `, ${streak}일 연속` : ''}`}
      >
        <span className={styles.emoji} aria-hidden="true">
          {emoji ?? '•'}
        </span>
        <span className={styles.rowText} aria-hidden="true">
          <span className={styles.name}>{name}</span>
          {streak > 0 && <span className={styles.streak}>🔥 {streak}일 연속</span>}
        </span>
        <span
          className={`${styles.circle} ${pop ? styles.pop : ''}`}
          onAnimationEnd={() => setPop(false)}
          aria-hidden="true"
        >
          {checked && (
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>
    </li>
  );
}
