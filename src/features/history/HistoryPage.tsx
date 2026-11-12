/** ② 기록 (탭 2) — 월별 기록 달력은 3단계에서 만듭니다. */
import styles from '../habits/habits.module.css';

export function HistoryPage() {
  return (
    <section className={styles.page} aria-labelledby="history-title">
      <header className={styles.header}>
        <h1 id="history-title" className={styles.title}>
          기록
        </h1>
      </header>
      <p className={styles.empty}>월별 기록 달력은 다음 단계에서 추가돼요.</p>
    </section>
  );
}
