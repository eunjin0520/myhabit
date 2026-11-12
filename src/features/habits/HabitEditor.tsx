/**
 * ④ 추가/수정 창 (아래에서 올라오는 창) — F-01, F-02
 * 이름(필수 1~30자) · 이모지(선택) · 색상 8개 · 저장/취소
 * 이름이 비면 저장 비활성, 수정 모드에만 "습관 삭제" 버튼
 */
import { useId, useState, type FormEvent } from 'react';
import { COLOR_NAMES, EMOJI_CHOICES, habitColor } from '../../core/colors';
import { addHabit, countChars, NAME_MAX, updateHabit } from '../../core/habitStore';
import type { Habit } from '../../core/db';
import styles from './habits.module.css';

export const EDITOR_TITLE_ID = 'habit-editor-title';

interface Props {
  /** 수정할 습관. 없으면 추가 모드 */
  habit?: Habit;
  onClose: () => void;
  onRequestDelete: (habit: Habit) => void;
}

export function HabitEditor({ habit, onClose, onRequestDelete }: Props) {
  const titleId = useId();
  const [name, setName] = useState(habit?.name ?? '');
  const [emoji, setEmoji] = useState<string | undefined>(habit?.emoji);
  const [colorIndex, setColorIndex] = useState(habit?.colorIndex ?? 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const length = countChars(name.trim());
  const tooLong = length > NAME_MAX;
  const canSave = length > 0 && !tooLong && !saving;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const input = { name, emoji, colorIndex };
      if (habit) await updateHabit(habit.id, input);
      else await addHabit(input);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했어요.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={styles.editor}>
      <h2 id={EDITOR_TITLE_ID} className={styles.editorTitle}>
        {habit ? '습관 수정' : '새 습관'}
      </h2>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>이름</span>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            // 한글 입력 중 Enter는 글자 확정용 → 저장하지 않음
            if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault();
          }}
          placeholder="예: 물 2L 마시기"
          enterKeyHint="done"
          autoComplete="off"
          aria-invalid={tooLong}
          aria-describedby={`${titleId}-count`}
          data-autofocus={habit ? undefined : true}
        />
        <span id={`${titleId}-count`} className={`${styles.count} ${tooLong ? styles.countOver : ''}`}>
          {length} / {NAME_MAX}
          {tooLong && ' · 30자까지 쓸 수 있어요'}
        </span>
      </label>

      <fieldset className={styles.field}>
        <legend className={styles.fieldLabel}>아이콘</legend>
        <div className={styles.emojiGrid}>
          <button
            type="button"
            className={`${styles.emojiBtn} ${emoji === undefined ? styles.selected : ''}`}
            aria-pressed={emoji === undefined}
            onClick={() => setEmoji(undefined)}
          >
            <span className={styles.noneText}>없음</span>
          </button>
          {EMOJI_CHOICES.map((e) => (
            <button
              type="button"
              key={e}
              className={`${styles.emojiBtn} ${emoji === e ? styles.selected : ''}`}
              aria-pressed={emoji === e}
              aria-label={e}
              onClick={() => setEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.fieldLabel}>색상</legend>
        <div className={styles.colorRow} role="radiogroup">
          {COLOR_NAMES.map((label, i) => (
            <button
              type="button"
              key={label}
              role="radio"
              aria-checked={colorIndex === i}
              aria-label={label}
              className={`${styles.colorBtn} ${colorIndex === i ? styles.colorSelected : ''}`}
              style={{ background: habitColor(i) }}
              onClick={() => setColorIndex(i)}
            />
          ))}
        </div>
      </fieldset>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.secondaryBtn} onClick={onClose}>
          취소
        </button>
        <button type="submit" className={styles.saveBtn} disabled={!canSave}>
          저장
        </button>
      </div>

      {habit && (
        <button type="button" className={styles.deleteLink} onClick={() => onRequestDelete(habit)}>
          습관 삭제
        </button>
      )}
    </form>
  );
}
