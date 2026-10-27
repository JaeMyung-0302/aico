import type { ViewStyle } from 'react-native'
import { COLORS } from './colors'

// SCR-00 tokens.json shadow — "1": { color: ink, opacity 0.10, offsetY 8, blur 24 }. RN shadowRadius 는 blur 의 절반
export const SHADOW = {
  none: {},
  1: {
    shadowColor: COLORS.ink,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 6,
  },
} as const satisfies Record<string, ViewStyle>
