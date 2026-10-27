// SCR-00 tokens.json colors 를 그대로 옮긴 값. 컴포넌트·화면은 이 토큰만 참조한다
export const COLORS = {
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  border: '#EDEDEA',
  ink: '#17171A',
  ink2: '#4A4A52',
  ink3: '#6E6E78',
  accent: '#CC3355',
  accentPressed: '#B02A48',
  blush: '#FBEEF1',
  danger: '#A3261C',
  scrim: 'rgba(23,23,26,0.45)',
  // tokens.json 에는 없고 시안 HTML 에만 쓰인 선 색 (토글 꺼짐·시트 손잡이·점선 테두리)
  line: '#D6D6D1',
  // 시안 HTML 에만 있는 색: SCR-09 사진 뷰어 바탕, 사진 위 반투명 배지·덮개(SCR-05 업로드 상태)
  night: '#0E0E10',
  photoBadge: 'rgba(23,23,26,0.55)',
  photoVeil: 'rgba(255,255,255,0.55)',
} as const

// tokens.json colors.photoPlaceholder — 사진 자리표시 톤 (돌려가며 쓴다)
export const PHOTO_PLACEHOLDER = ['#E8E2DA', '#DCE3E5', '#E6E1EA', '#E3E6DD'] as const

// 카카오 로그인 버튼 고정 색 (브랜드 가이드 — 테마와 무관)
export const KAKAO_COLORS = { container: '#FEE500', label: 'rgba(0,0,0,0.85)', symbol: '#000000' } as const

export type ColorToken = keyof typeof COLORS
