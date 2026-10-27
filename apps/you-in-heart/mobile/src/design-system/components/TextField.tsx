import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native'
import { COLORS } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'
import { SPACING } from '../tokens/spacing'
import { TYPOGRAPHY } from '../tokens/typography'
import AppText from './AppText'

type TextFieldProps = TextInputProps & {
  label: string
  errorMessage?: string | null
}

// SCR-02 입력칸: 위에 작은 라벨, 54px 높이, 테두리 border
const TextField = ({ label, errorMessage, style, ...rest }: TextFieldProps) => (
  <View style={styles.wrap}>
    <AppText variant="caption" color="ink2">
      {label}
    </AppText>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={COLORS.ink3}
      style={[styles.input, errorMessage ? styles.inputError : null, style]}
      {...rest}
    />
    {errorMessage ? (
      <AppText variant="caption" color="danger" accessibilityRole="alert">
        {errorMessage}
      </AppText>
    ) : null}
  </View>
)

const styles = StyleSheet.create({
  wrap: { gap: SPACING[2] },
  input: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    height: 54,
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.ink,
    backgroundColor: COLORS.bg,
  },
  inputError: { borderColor: COLORS.danger },
})

export default TextField
