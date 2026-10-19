import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { DeviceEventEmitter, Platform, Text } from 'react-native'
import KeyboardAvoider from '../KeyboardAvoider'

// SDK 57 Android는 edge-to-edge 강제 → adjustResize가 창을 줄여 주지 않는다. 앱이 직접 키보드 높이만큼 비켜야 한다
const SCREEN_HEIGHT = 800
const KEYBOARD_HEIGHT = 300

const keyboardEvent = {
  duration: 0,
  easing: 'keyboard',
  startCoordinates: { screenX: 0, screenY: SCREEN_HEIGHT, width: 400, height: 0 },
  endCoordinates: { screenX: 0, screenY: SCREEN_HEIGHT - KEYBOARD_HEIGHT, width: 400, height: KEYBOARD_HEIGHT },
}

const paddingBottomOf = (testID: string): unknown => {
  const style = [screen.getByTestId(testID).props.style].flat(Infinity)
  return style.reduce<unknown>(
    (found, entry) => (entry && typeof entry === 'object' && 'paddingBottom' in entry ? entry.paddingBottom : found),
    undefined,
  )
}

describe('KeyboardAvoider', () => {
  it('Android에서도 키보드가 올라오면 그 높이만큼 아래 여백을 준다', async () => {
    jest.replaceProperty(Platform, 'OS', 'android')
    await render(
      <KeyboardAvoider testID="avoider">
        <Text>입력 폼</Text>
      </KeyboardAvoider>,
    )
    const view = screen.getByTestId('avoider')
    await fireEvent(view, 'layout', {
      persist: () => undefined,
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: SCREEN_HEIGHT } },
    })
    await act(async () => {
      DeviceEventEmitter.emit('keyboardDidShow', keyboardEvent)
    })
    expect(paddingBottomOf('avoider')).toBe(KEYBOARD_HEIGHT)
    expect(screen.getByText('입력 폼')).toBeOnTheScreen()
  })
})
