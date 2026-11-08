import { render, renderHook, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import AppFrame, { APP_FRAME_MAX_WIDTH, useFrameWidth } from '@/design-system/components/AppFrame'

let mockWidth = 390
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: mockWidth, height: 900, scale: 2, fontScale: 1 }),
}))

const mockWindowWidth = (width: number) => {
  mockWidth = width
}

describe('useFrameWidth', () => {
  it('휴대폰처럼 창이 틀보다 좁으면 창 폭을 그대로 쓴다', async () => {
    mockWindowWidth(390)
    const { result } = await renderHook(() => useFrameWidth())
    expect(result.current).toBe(390)
  })

  it('웹처럼 창이 넓으면 틀 최대 폭으로 자른다', async () => {
    mockWindowWidth(1456)
    const { result } = await renderHook(() => useFrameWidth())
    expect(result.current).toBe(APP_FRAME_MAX_WIDTH)
  })
})

describe('AppFrame', () => {
  it('자식을 최대 폭 틀 안에 그린다', async () => {
    await render(
      <AppFrame>
        <Text>내용</Text>
      </AppFrame>,
    )
    expect(screen.getByText('내용')).toBeOnTheScreen()
  })
})
