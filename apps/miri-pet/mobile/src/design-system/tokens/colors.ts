// 디자인 캔버스(미리펫 디자인 시안) 기준 색상. 컴포넌트는 이 토큰만 참조한다
export const COLORS = {
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#E6EEFD',
  onPrimarySoft: '#1E3A8A',
  warm: '#F2C77B',
  warmSoft: '#FDF3E1',
  onWarmSoft: '#7A5A1E',
  ground: '#F6F7FB',
  surface: '#FFFFFF',
  border: '#E4E7EE',
  borderStrong: '#D5D9E2',
  divider: '#EEF0F4',
  ink: '#141821',
  ink2: '#4B5363',
  ink3: '#6B7280',
  danger: '#C2410C',
  dangerSoft: '#FCE4D6',
  success: '#15803D',
  successSoft: '#DCF2E3',
  kakao: '#FEE500',
  onKakao: '#191919',
  scrim: 'rgba(20, 24, 33, 0.55)',
} as const

// 사진이 없을 때 아바타·썸네일 배경으로 돌려가며 쓴다
export const PLACEHOLDER_TINTS = [
  { background: '#F7E6C8', foreground: '#7A5A1E' },
  { background: '#D8EFEA', foreground: '#1F6B5E' },
  { background: '#DCE6F9', foreground: '#1E3A8A' },
  { background: '#E3E0F5', foreground: '#4C3F8F' },
  { background: '#FDE7D6', foreground: '#9A3412' },
] as const

// Google 로고 고정 색 (브랜드 가이드 — 테마와 무관)
export const GOOGLE_LOGO_COLORS = { blue: '#4285F4', green: '#34A853', yellow: '#FBBC05', red: '#EA4335' } as const

export type ColorToken = keyof typeof COLORS
