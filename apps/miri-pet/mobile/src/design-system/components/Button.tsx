import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native'
import { COLORS, type ColorToken } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'
import AppText from './AppText'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dark' | 'ghost'

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string
  variant?: ButtonVariant
  isLoading?: boolean
  size?: 'lg' | 'md'
}

const VARIANT: Record<ButtonVariant, { background: ColorToken | null; text: ColorToken; border?: ColorToken }> = {
  primary: { background: 'primary', text: 'surface' },
  secondary: { background: 'surface', text: 'ink', border: 'borderStrong' },
  danger: { background: 'danger', text: 'surface' },
  dark: { background: 'ink', text: 'surface' },
  ghost: { background: null, text: 'ink2' },
}

const Button = ({
  label,
  variant = 'primary',
  isLoading = false,
  size = 'lg',
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
        (state.pressed || isDisabled) && styles.dimmed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={COLORS[tone.text]} />
      ) : (
        <AppText variant="button" color={tone.text}>
          {label}
        </AppText>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.lg, paddingHorizontal: 16 },
  lg: { height: 54 },
  md: { height: 44, borderRadius: RADIUS.md },
  dimmed: { opacity: 0.6 },
})

export default Button
