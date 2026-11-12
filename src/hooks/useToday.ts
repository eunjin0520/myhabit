/**
 * 오늘 dayKey를 돌려주고, 날짜가 바뀌면 자동으로 갱신합니다. (계획서 7장 2번)
 * - 앱을 다시 열거나 다른 앱에서 돌아올 때 (visibilitychange · focus)
 * - 앱을 켜 둔 채 자정이 지날 때 (다음 자정 타이머 + 1분마다 재확인: 휴대폰이 잠들면 타이머가 멈추기 때문)
 */
import { useEffect, useState } from 'react';
import { msUntilNextMidnight, todayKey, type DayKey } from '../core/dayKey';

export function useToday(): DayKey {
  const [today, setToday] = useState(todayKey);

  useEffect(() => {
    let timer = 0;
    const check = () => setToday((prev) => {
      const t = todayKey();
      return t === prev ? prev : t;
    });
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        check();
        schedule();
      }, msUntilNextMidnight() + 500);
    };
    const onReturn = () => {
      if (document.visibilityState === 'visible') {
        check();
        schedule();
      }
    };

    schedule();
    const interval = window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, []);

  return today;
}
