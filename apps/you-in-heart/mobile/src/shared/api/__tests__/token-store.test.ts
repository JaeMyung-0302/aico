import * as SecureStore from 'expo-secure-store'
import { tokenStore } from '../token-store'

// 기기 보안 저장소(네이티브) 경계만 메모리로 대체한다
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>()
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value)
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key)
    }),
  }
})

describe('tokenStore (SecureStore)', () => {
  it('저장한 토큰 쌍을 읽고, clear 후에는 null', async () => {
    await expect(tokenStore.read()).resolves.toBeNull()
    await tokenStore.save({ accessToken: 'a', refreshToken: 'r' })
    await expect(tokenStore.read()).resolves.toEqual({ accessToken: 'a', refreshToken: 'r' })
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('youinheart.accessToken', 'a')

    await tokenStore.clear()
    await expect(tokenStore.read()).resolves.toBeNull()
  })

  it('둘 중 하나만 있으면 null (반쪽 세션은 로그아웃으로 본다)', async () => {
    await SecureStore.setItemAsync('youinheart.accessToken', 'a')
    await expect(tokenStore.read()).resolves.toBeNull()
  })
})
