import { Pressable, StyleSheet, View } from 'react-native'
import { COLORS } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'

type ToggleProps = {
  label: string
  isOn: boolean
  onChange: (next: boolean) => void
  isDisabled?: boolean
}

const TRACK = { width: 48, height: 28 }
const THUMB = 22

// 토큰 색을 쓰는 스위치 (스크린리더에는 role=switch + checked로 읽힌다)
const Toggle = ({ label, isOn, onChange, isDisabled = false }: ToggleProps) => (
  <Pressable
    accessibilityRole="switch"
    accessibilityLabel={label}
    accessibilityState={{ checked: isOn, disabled: isDisabled }}
    disabled={isDisabled}
    hitSlop={8}
    onPress={() => onChange(!isOn)}
    style={[styles.track, isOn ? styles.trackOn : styles.trackOff, isDisabled && styles.disabled]}
  >
    <View style={[styles.thumb, isOn ? styles.thumbOn : null]} />
  </Pressable>
)

const styles = StyleSheet.create({
  track: { ...TRACK, borderRadius: RADIUS.pill, padding: (TRACK.height - THUMB) / 2, justifyContent: 'center' },
  trackOn: { backgroundColor: COLORS.primary },
  trackOff: { backgroundColor: COLORS.borderStrong },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: COLORS.surface },
  thumbOn: { alignSelf: 'flex-end' },
  disabled: { opacity: 0.6 },
})

export default Toggle
