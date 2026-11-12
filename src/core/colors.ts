/** 습관 색 8개의 이름 (theme.css의 --habit-0 ~ --habit-7 과 같은 순서) */
export const COLOR_NAMES = ['빨강', '주황', '노랑', '초록', '청록', '파랑', '보라', '분홍'] as const;

export function habitColor(index: number): string {
  return `var(--habit-${index})`;
}

/** 추가/수정 창에서 고를 수 있는 이모지 */
export const EMOJI_CHOICES = [
  '💧', '🏃', '💪', '🧘', '🚶', '🚴', '📚', '✍️',
  '🧠', '💊', '🥗', '🍎', '😴', '🛏️', '🦷', '🧴',
  '🧹', '💰', '🎹', '🎨', '🌱', '☀️', '📵', '🙏',
] as const;
