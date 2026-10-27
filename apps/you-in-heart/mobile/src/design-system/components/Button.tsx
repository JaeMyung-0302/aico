import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native'
import { COLORS, type ColorToken } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'
import { SPACING } from '../tokens/spacing'
import type { TypographyVariant } from '../tokens/typography'
import AppText from './AppText'

// SCR-02·16·18 버튼: 포인트(로즈)·진한·테두리·위험·텍스트
type ButtonVariant = 'primary' | 'dark' | 'outline' | 'danger' | 'text'

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string
  variant?: ButtonVariant
  isLoading?: boolean
  size?: 'lg' | 'md'
  leading?: ReactNode
}

type Tone = { background: ColorToken | null; text: ColorToken; border?: ColorToken }

const VARIANT: Record<ButtonVariant, Tone> = {
  primary: { background: 'accent', text: 'bg' },
  dark: { background: 'ink', text: 'bg' },
  outline: { background: 'bg', text: 'ink', border: 'border' },
  danger: { background: 'danger', text: 'bg' },
  text: { background: null, text: 'ink2' },
}

const labelVariant = (variant: ButtonVariant, size: 'lg' | 'md'): TypographyVariant => {
  if (variant === 'text') return 'label'
  return size === 'lg' ? 'button' : 'labelStrong'
}

const Button = ({
  label,
  variant = 'primary',
  isLoading = false,
  size = 'lg',
  leading,
  disabled,
  style,
  ...rest
}: ButtonProps) => {
  const tone = VARIANT[variant]
  const isDisabled = disabled === true || isLoading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        tone.background ? { backgroundColor: COLORS[tone.background] } : null,
        tone.border ? { borderWidth: 1, borderColor: COLORS[tone.border] } : null,
        state.pressed && variant === 'primary' ? { backgroundColor: COLORS.accentPressed } : null,
        isDisabled && styles.dimmed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {isLoading ? <ActivityIndicator color={COLORS[tone.text]} /> : leading}
      {isLoading ? null : (
        <AppText variant={labelVariant(variant, size)} color={tone.text}>
          {label}
        </AppText>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    gap: SPACING[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING[5],
  },
  lg: { height: 54 },
  md: { height: 44 },
  dimmed: { opacity: 0.5 },
})

export default Button
