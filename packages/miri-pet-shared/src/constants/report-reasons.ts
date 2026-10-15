// 디자인 ReportSheet 사유 순서와 같다
export const REPORT_REASONS = ['SPAM', 'ANIMAL_ABUSE', 'HATE', 'SEXUAL', 'PRIVACY', 'ETC'] as const

export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  SPAM: '스팸 · 광고',
  ANIMAL_ABUSE: '동물 학대 · 유해한 내용',
  HATE: '혐오 · 괴롭힘',
  SEXUAL: '음란물',
  PRIVACY: '개인정보 노출',
  ETC: '기타',
}
