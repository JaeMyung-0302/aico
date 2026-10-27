import { renderHook } from '@testing-library/react-native'
import { router } from 'expo-router'
import { useShareIntentContext } from 'expo-share-intent'
import type { AuthDestination } from '@/modules/auth/util-auth-gate/resolve-auth-redirect'
import { useShareRouting } from '../feature-share-receive/useShareRouting'
import { pendingShare } from '../util-share/pending-share'

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
jest.mock('expo-share-intent', () => ({ useShareIntentContext: jest.fn() }))

const resetShareIntent = jest.fn()

const mockIntent = (shareIntent: Record<string, unknown> | null) => {
  jest.mocked(useShareIntentContext).mockReturnValue({
    isReady: true,
    hasShareIntent: shareIntent !== null,
    shareIntent: { text: null, files: null, type: null, webUrl: null, ...shareIntent },
    resetShareIntent,
    error: null,
  })
}

const TEXT_INTENT = { type: 'text', text: '보고 싶어' }

beforeEach(() => {
  jest.clearAllMocks()
  pendingShare.getState().clear()
})

describe('useShareRouting (plan 4D.1)', () => {
  it('받은 공유를 기억해 두고 네이티브 공유는 비운다 — 로그인 전에는 이동하지 않는다', async () => {
    mockIntent(TEXT_INTENT)
    await renderHook(() => useShareRouting('/login'))
    expect(pendingShare.getState().payload).toEqual({ kind: 'text', text: '보고 싶어' })
    expect(resetShareIntent).toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('로그인 후 탭에 도착하면 원래 공유로 돌아간다(텍스트·이미지 → 저장 화면)', async () => {
    mockIntent(TEXT_INTENT)
    const view = await renderHook(({ destination }: { destination: AuthDestination | null }) => useShareRouting(destination), {
      initialProps: { destination: '/login' as AuthDestination | null },
    })
    mockIntent(null)
    await view.rerender({ destination: '/(tabs)' })
    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith('/quotes/share')
    await view.rerender({ destination: '/(tabs)' })
    expect(router.push).toHaveBeenCalledTimes(1)
  })

  it('.txt 파일은 가져오기 화면으로 간다', async () => {
    mockIntent({ type: 'file', files: [{ fileName: 'k.txt', mimeType: 'text/plain', path: 'file:///k.txt', size: 1 }] })
    await renderHook(() => useShareRouting('/(tabs)'))
    expect(router.push).toHaveBeenCalledWith('/quotes/import')
  })

  it('미연결(페어링)이면 안내 화면을 열고, 연결되어 탭으로 바뀌면 다시 저장 화면으로 간다', async () => {
    mockIntent(TEXT_INTENT)
    const view = await renderHook(({ destination }: { destination: AuthDestination | null }) => useShareRouting(destination), {
      initialProps: { destination: '/pairing' as AuthDestination | null },
    })
    expect(router.push).toHaveBeenLastCalledWith('/quotes/share')
    mockIntent(null)
    await view.rerender({ destination: '/(tabs)' })
    expect(router.push).toHaveBeenCalledTimes(2)
  })
})
