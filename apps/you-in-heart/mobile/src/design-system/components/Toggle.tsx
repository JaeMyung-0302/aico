import { Pressable, StyleSheet, View } from 'react-native'
import { COLORS } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'

type ToggleProps = {
  label: string
  isOn: boolean
  onChange: (next: boolean) => void
  isDisabled?: boolean
}

// SCR-16 스위치 46×28 (켜짐 accent, 꺼짐 line). 스크린리더에는 role=switch + checked로 읽힌다
const TRACK = { width: 46, height: 28 }
const THUMB = 22

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
  trackOn: { backgroundColor: COLORS.accent },
  trackOff: { backgroundColor: COLORS.line },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: COLORS.bg },
  thumbOn: { alignSelf: 'flex-end' },
  disabled: { opacity: 0.5 },
})

export default Toggle
