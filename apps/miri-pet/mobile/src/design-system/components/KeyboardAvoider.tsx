import { KeyboardAvoidingView, type KeyboardAvoidingViewProps, StyleSheet } from 'react-native'

type KeyboardAvoiderProps = Omit<KeyboardAvoidingViewProps, 'behavior'>

// 키보드가 입력창을 가리지 않게 화면 아래를 키보드 높이만큼 비운다.
// Expo SDK 57의 Android는 edge-to-edge가 강제라 adjustResize(기본값)가 창을 줄여 주지 않는다 → iOS와 같이 'padding'을 쓴다
const KeyboardAvoider = ({ style, ...rest }: KeyboardAvoiderProps) => (
  <KeyboardAvoidingView behavior="padding" style={[styles.fill, style]} {...rest} />
)

const styles = StyleSheet.create({ fill: { flex: 1 } })

export default KeyboardAvoider
