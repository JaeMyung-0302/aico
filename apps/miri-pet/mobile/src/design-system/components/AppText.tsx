import { Text, type TextProps } from 'react-native'
import { COLORS, type ColorToken } from '../tokens/colors'
import { TYPOGRAPHY, type TypographyVariant } from '../tokens/typography'

type AppTextProps = TextProps & {
  variant?: TypographyVariant
  color?: ColorToken
}

const AppText = ({ variant = 'body', color = 'ink', style, ...rest }: AppTextProps) => (
  <Text style={[TYPOGRAPHY[variant], { color: COLORS[color] }, style]} {...rest} />
)

export default AppText
