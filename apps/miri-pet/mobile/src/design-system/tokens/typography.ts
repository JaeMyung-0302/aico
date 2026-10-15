import type { TextStyle } from 'react-native'

export const FONT_FAMILY = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const

const style = (fontFamily: string, fontSize: number, lineHeight: number, letterSpacing = 0): TextStyle => ({
  fontFamily,
  fontSize,
  lineHeight,
  letterSpacing,
})

export const TYPOGRAPHY = {
  display: style(FONT_FAMILY.bold, 34, 42, -1),
  title1: style(FONT_FAMILY.bold, 24, 34, -0.5),
  title2: style(FONT_FAMILY.bold, 22, 30, -0.4),
  title3: style(FONT_FAMILY.bold, 17, 24),
  body: style(FONT_FAMILY.regular, 15, 23),
  bodyStrong: style(FONT_FAMILY.semibold, 15, 23),
  callout: style(FONT_FAMILY.regular, 14, 21),
  calloutStrong: style(FONT_FAMILY.semibold, 14, 21),
  caption: style(FONT_FAMILY.regular, 12, 17),
  captionStrong: style(FONT_FAMILY.semibold, 12, 17),
  button: style(FONT_FAMILY.semibold, 16, 22),
  tab: style(FONT_FAMILY.semibold, 11, 14),
} as const

export type TypographyVariant = keyof typeof TYPOGRAPHY
