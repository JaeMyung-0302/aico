import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'
import { PLACEHOLDER_TINTS } from '../tokens/colors'
import AppText from './AppText'

type AvatarProps = {
  name: string
  uri?: string | null
  size?: number
}

// 이름 첫 글자 기준으로 placeholder 색을 고정한다
const pickTint = (name: string) => PLACEHOLDER_TINTS[(name.codePointAt(0) ?? 0) % PLACEHOLDER_TINTS.length]

const Avatar = ({ name, uri, size = 40 }: AvatarProps) => {
  const shape = { width: size, height: size, borderRadius: size / 2 }
  if (uri) return <Image accessibilityLabel={`${name} 프로필 사진`} source={{ uri }} style={shape} contentFit="cover" />
  const tint = pickTint(name)
  return (
    <View
      accessibilityLabel={`${name} 프로필`}
      style={[styles.placeholder, shape, { backgroundColor: tint.background }]}
    >
      <AppText variant="bodyStrong" style={{ color: tint.foreground, fontSize: size * 0.38 }}>
        {name.slice(0, 1)}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
})

export default Avatar
