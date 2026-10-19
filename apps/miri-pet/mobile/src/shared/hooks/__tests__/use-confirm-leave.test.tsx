import { renderHook } from '@testing-library/react-native'
import { usePreventRemove } from 'expo-router/react-navigation'
import { Alert, type AlertButton } from 'react-native'
import { useConfirmLeave } from '../use-confirm-leave'

const mockDispatch = jest.fn()
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: mockDispatch }) }))
// 내비게이터 경계: 헤더 뒤로·안드로이드 하드웨어 뒤로·스와이프 모두 이 훅으로 막힌다
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }))

const LEAVE_ACTION = { type: 'GO_BACK' }

const lastPreventRemoveCall = () => {
  const calls = jest.mocked(usePreventRemove).mock.calls
  const last = calls[calls.length - 1]
  if (!last) throw new Error('usePreventRemove가 호출되지 않았다')
  return { isPrevented: last[0], onPrevented: last[1] }
}

const alertButtons = (): AlertButton[] => jest.mocked(Alert.alert).mock.calls[0]?.[2] ?? []
const pressAlertButton = (text: string) => alertButtons().find((button) => button.text === text)?.onPress?.()

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
})

describe('useConfirmLeave', () => {
  it('작성 중인 내용이 없으면 나가기를 막지 않는다', async () => {
    await renderHook(() => useConfirmLeave(false))
    expect(lastPreventRemoveCall().isPrevented).toBe(false)
  })

  it('작성 중이면 나가기를 막고 "작성 중인 내용이 사라져요" 확인을 띄운다', async () => {
    await renderHook(() => useConfirmLeave(true))
    const { isPrevented, onPrevented } = lastPreventRemoveCall()
    expect(isPrevented).toBe(true)

    onPrevented({ data: { action: LEAVE_ACTION } })

    expect(Alert.alert).toHaveBeenCalledWith('작성 중인 내용이 사라져요', expect.any(String), expect.any(Array))
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('"나가기"를 고르면 막아 둔 이동을 그대로 실행한다', async () => {
    await renderHook(() => useConfirmLeave(true))
    lastPreventRemoveCall().onPrevented({ data: { action: LEAVE_ACTION } })
    pressAlertButton('나가기')
    expect(mockDispatch).toHaveBeenCalledWith(LEAVE_ACTION)
  })

  it('"계속 작성"을 고르면 화면에 머문다', async () => {
    await renderHook(() => useConfirmLeave(true))
    lastPreventRemoveCall().onPrevented({ data: { action: LEAVE_ACTION } })
    pressAlertButton('계속 작성')
    expect(mockDispatch).not.toHaveBeenCalled()
    expect(alertButtons().find((button) => button.text === '계속 작성')?.style).toBe('cancel')
  })
})
