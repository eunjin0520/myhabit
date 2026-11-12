/**
 * ⑤ 삭제 확인 창 — 문구는 계획서 2장 그대로
 * 처음 선택은 "취소", "삭제"는 빨간색
 */
import { useState } from 'react';
import styles from './habits.module.css';

interface Props {
  name: string;
  logCount: number;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export const DELETE_TITLE_ID = 'delete-confirm-title';
export const DELETE_DESC_ID = 'delete-confirm-desc';

export function DeleteConfirm({ name, logCount, onCancel, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);

  return (
    <div className={styles.confirm}>
      <h2 id={DELETE_TITLE_ID} className={styles.confirmTitle}>
        "{name}" 습관을 삭제할까요?
      </h2>
      <div id={DELETE_DESC_ID}>
        <p className={styles.confirmBody}>
          {logCount > 0
            ? `지금까지의 체크 기록 ${logCount}개도 함께 지워지며, 되돌릴 수 없어요.`
            : '이 습관은 아직 체크 기록이 없어요. 삭제하면 되돌릴 수 없어요.'}{' '}
          기록 달력의 지난 날짜 달성률도 이 습관을 빼고 다시 계산돼요.
        </p>
        <p className={styles.confirmHelp}>기록을 남겨 두려면 먼저 설정에서 백업을 내보내세요.</p>
      </div>
      <div className={styles.confirmActions}>
        <button className={styles.secondaryBtn} onClick={onCancel} data-autofocus>
          취소
        </button>
        <button
          className={styles.dangerBtn}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
        >
          삭제
        </button>
      </div>
    </div>
  );
}
