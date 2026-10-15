import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native'
import { COLORS } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'
import { SPACING } from '../tokens/spacing'
import { TYPOGRAPHY } from '../tokens/typography'
import AppText from './AppText'

type TextFieldProps = TextInputProps & {
  label: string
  errorMessage?: string
  isRequired?: boolean
}

const TextField = ({ label, errorMessage, isRequired = false, style, ...rest }: TextFieldProps) => (
  <View style={styles.wrap}>
    <AppText variant="captionStrong" color="ink2">
      {isRequired ? `${label} *` : label}
    </AppText>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={COLORS.ink3}
      style={[styles.input, errorMessage ? styles.inputError : null, style]}
      {...rest}
    />
    {errorMessage ? (
      <AppText variant="caption" color="danger">
        {errorMessage}
      </AppText>
    ) : null}
  </View>
)

const styles = StyleSheet.create({
  wrap: { gap: SPACING.xs + 2 },
  input: {
    ...TYPOGRAPHY.body,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    color: COLORS.ink,
    backgroundColor: COLORS.surface,
  },
  inputError: { borderColor: COLORS.danger },
})

export default TextField
