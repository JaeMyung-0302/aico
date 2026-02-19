/**
 * 광고 SDK 래퍼 (MVP: 모킹)
 * Phase 6에서 실제 AdMob/AdSense SDK 연동
 */

let revivesUsedThisSession = 0

/**
 * 리워드 광고 표시 (모킹: 1초 대기 후 성공)
 * 실제 구현 시 AdMob rewarded ad SDK 호출
 */
export const showRewardedAd = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // 모킹: 1초 후 성공 반환
    setTimeout(() => {
      resolve(true)
    }, 1000)
  })
}

/**
 * 이번 세션에서 부활 사용 가능 여부
 */
export const canRevive = (): boolean => {
  return revivesUsedThisSession < 1
}

/**
 * 부활 사용 카운트 증가
 */
export const markReviveUsed = (): void => {
  revivesUsedThisSession += 1
}

/**
 * 세션 리셋 (새 게임 시작 시)
 */
export const resetAdSession = (): void => {
  revivesUsedThisSession = 0
}
