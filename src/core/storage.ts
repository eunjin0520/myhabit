/**
 * 브라우저에 "이 앱의 저장 데이터를 함부로 지우지 말라"고 요청합니다. (계획서 5장)
 * 허락 여부는 브라우저가 정하고, 거절돼도 앱은 그대로 동작합니다.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** 홈 화면 아이콘으로 실행 중인지 (주소창 없는 전체 화면) */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
