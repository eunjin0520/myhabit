/** 화면 아래 잠깐 뜨는 안내 (예: "습관을 삭제했어요" 2초) */
import { useEffect } from 'react';
import styles from './Toast.module.css';

export interface ToastMessage {
  id: number;
  text: string;
}

export function Toast({ message, onDone }: { message: ToastMessage | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, 2000);
    return () => window.clearTimeout(t);
  }, [message, onDone]);

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {message && (
        <div key={message.id} className={styles.toast}>
          {message.text}
        </div>
      )}
    </div>
  );
}
