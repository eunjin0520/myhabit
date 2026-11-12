/** 오늘 달성률 링 (F-07) — 모두 체크하면 링이 채워지는 애니메이션 */
import styles from './today.module.css';

export function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 56;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const rate = total === 0 ? 0 : done / total;
  const complete = total > 0 && done === total;

  return (
    <div className={`${styles.ring} ${complete ? styles.ringComplete : ''}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className={styles.ringTrack} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className={styles.ringValue}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - rate)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {complete && (
          <path
            className={styles.ringCheck}
            d={`M${size / 2 - 9} ${size / 2} l6 6 l12 -12`}
            fill="none"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <div className={styles.ringText}>
        <strong>
          {done} / {total}
        </strong>{' '}
        완료
      </div>
    </div>
  );
}
