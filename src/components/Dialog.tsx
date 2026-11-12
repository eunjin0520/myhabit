/**
 * 브라우저 기본 <dialog>를 감싼 창.
 * - 열리면 뒤 화면은 누를 수 없고(모달), Esc·뒤 배경 탭으로 닫힘
 * - data-autofocus 가 붙은 요소에 처음 포커스 (삭제 확인 창은 "취소")
 * - 창 위에 다른 창을 열 수 있음 (수정 창 위의 삭제 확인 창)
 */
import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  /** sheet = 아래에서 올라오는 창, alert = 가운데 확인 창 */
  variant: 'sheet' | 'alert';
  labelledBy: string;
  describedBy?: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, variant, labelledBy, describedBy, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[variant]}`}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      role={variant === 'alert' ? 'alertdialog' : undefined}
      onCancel={(e) => {
        e.preventDefault(); // Esc: 직접 닫아서 React 상태와 맞춤
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // 뒤 배경 탭
      }}
    >
      {open && <div className={styles.body}>{children}</div>}
    </dialog>
  );
}
