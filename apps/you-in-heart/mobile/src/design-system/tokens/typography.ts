import type { TextStyle } from 'react-native'

// SCR-00 tokens.json typography 를 그대로 옮긴 값 (lineHeight 는 배수)
export const TYPE_SCALE = {
  fontFamily: { sans: 'Pretendard', serif: 'Noto Serif KR' },
  display: { size: 64, weight: 500, lineHeight: 1.1, family: 'serif' },
  title: { size: 22, weight: 500, lineHeight: 1.4, family: 'serif' },
  heading: { size: 17, weight: 700, lineHeight: 1.4, family: 'sans' },
  body: { size: 15, weight: 400, lineHeight: 1.6, family: 'sans' },
  caption: { size: 13, weight: 400, lineHeight: 1.5, family: 'sans' },
  micro: { size: 11, weight: 400, lineHeight: 1.4, family: 'sans' },
} as const

// Pretendard·Noto Serif KR 는 굵기마다 파일이 따로라 굵기별 family 이름으로 불러온다 (_layout useFonts)
export const FONT_FAMILY = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  bold: 'Pretendard-Bold',
  serifMedium: 'NotoSerifKR-Medium',
  serifBold: 'NotoSerifKR-Bold',
} as const

type Weight = 400 | 500 | 700
type Family = 'sans' | 'serif'

const SANS_BY_WEIGHT: Record<Weight, string> = {
  400: FONT_FAMILY.regular,
  500: FONT_FAMILY.medium,
  700: FONT_FAMILY.bold,
}

// 세리프는 500·700 두 굵기만 번들한다 (시안은 500 위주)
const serifStyle = (weight: Weight): TextStyle => ({
  fontFamily: weight === 700 ? FONT_FAMILY.serifBold : FONT_FAMILY.serifMedium,
})

const style = (size: number, weight: Weight, lineHeight: number, family: Family): TextStyle => ({
  ...(family === 'serif' ? serifStyle(weight) : { fontFamily: SANS_BY_WEIGHT[weight] }),
  fontSize: size,
  lineHeight: Math.round(size * lineHeight),
})

type ScaleEntry = { size: number; weight: Weight; lineHeight: number; family: Family }

const fromScale = ({ size, weight, lineHeight, family }: ScaleEntry): TextStyle =>
  style(size, weight, lineHeight, family)

// 토큰 6종 + 시안에서 반복되는 굵은 변형(버튼·강조·작은 강조)
export const TYPOGRAPHY = {
  display: fromScale(TYPE_SCALE.display),
  title: fromScale(TYPE_SCALE.title),
  heading: fromScale(TYPE_SCALE.heading),
  body: fromScale(TYPE_SCALE.body),
  caption: fromScale(TYPE_SCALE.caption),
  micro: fromScale(TYPE_SCALE.micro),
  bodyStrong: style(TYPE_SCALE.body.size, 700, TYPE_SCALE.body.lineHeight, 'sans'),
  button: style(16, 700, 1.4, 'sans'),
  label: style(14, 400, 1.6, 'sans'),
  labelStrong: style(14, 700, 1.6, 'sans'),
  captionStrong: style(TYPE_SCALE.caption.size, 700, TYPE_SCALE.caption.lineHeight, 'sans'),
} as const

export type TypographyVariant = keyof typeof TYPOGRAPHY
