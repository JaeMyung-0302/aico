import type { ReactNode } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { COLORS } from '../tokens/colors'

// 웹·넓은 화면에서도 휴대폰 폭으로 보이게 하는 최대 폭 (naracellar-app AppFrame과 같은 값)
export const APP_FRAME_MAX_WIDTH = 500

// 화면 폭으로 크기를 계산하는 곳(사진 격자·캐러셀)은 창 폭 대신 틀 안쪽 폭을 쓴다
export const useFrameWidth = (): number => Math.min(useWindowDimensions().width, APP_FRAME_MAX_WIDTH)

type AppFrameProps = {
  // 모달 안에서 쓸 때 바깥 여백을 칠하지 않아 아래 화면·덮개가 보이게 한다
  isTransparent?: boolean
  children: ReactNode
}

// 앱 전체를 최대 폭 안에 가운데 정렬한다. 웹 Modal은 body로 포털되어 루트 바깥에 그려지므로 모달 안에서 다시 감싼다
const AppFrame = ({ isTransparent = false, children }: AppFrameProps) => (
  <View style={[styles.container, !isTransparent && styles.gutter]} pointerEvents="box-none">
    <View style={[styles.frame, !isTransparent && styles.frameBg]} pointerEvents="box-none">
      {children}
    </View>
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  gutter: { backgroundColor: COLORS.frameGutter },
  frame: { flex: 1, width: '100%', maxWidth: APP_FRAME_MAX_WIDTH },
  frameBg: { backgroundColor: COLORS.bg },
})

export default AppFrame
