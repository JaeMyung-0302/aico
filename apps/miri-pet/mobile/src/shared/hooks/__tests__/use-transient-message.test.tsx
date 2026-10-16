import { act, renderHook } from '@testing-library/react-native'
import { useTransientMessage } from '../use-transient-message'

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('useTransientMessage (토스트 표시 시간)', () => {
  it('보여준 메시지는 정해진 시간이 지나면 사라진다', async () => {
    const { result } = await renderHook(() => useTransientMessage(3000))
    expect(result.current.message).toBeNull()

    await act(async () => result.current.show('잠시 후 다시 시도해 주세요'))
    expect(result.current.message).toBe('잠시 후 다시 시도해 주세요')

    await act(async () => jest.advanceTimersByTime(2999))
    expect(result.current.message).toBe('잠시 후 다시 시도해 주세요')

    await act(async () => jest.advanceTimersByTime(1))
    expect(result.current.message).toBeNull()
  })

  it('새 메시지를 보이면 표시 시간이 다시 시작된다', async () => {
    const { result } = await renderHook(() => useTransientMessage(3000))

    await act(async () => result.current.show('첫 번째'))
    await act(async () => jest.advanceTimersByTime(2000))
    await act(async () => result.current.show('두 번째'))
    await act(async () => jest.advanceTimersByTime(2000))

    expect(result.current.message).toBe('두 번째')
  })
})
