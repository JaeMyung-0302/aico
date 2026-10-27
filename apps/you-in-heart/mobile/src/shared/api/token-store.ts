import * as SecureStore from 'expo-secure-store'

const ACCESS_KEY = 'youinheart.accessToken'
const REFRESH_KEY = 'youinheart.refreshToken'

export type TokenPair = { accessToken: string; refreshToken: string }

// 토큰은 기기 보안 저장소(Keychain/Keystore)에만 둔다. 로그에 남기지 않는다
export const tokenStore = {
  read: async (): Promise<TokenPair | null> => {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ])
    return accessToken && refreshToken ? { accessToken, refreshToken } : null
  },
  save: async ({ accessToken, refreshToken }: TokenPair): Promise<void> => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ])
  },
  clear: async (): Promise<void> => {
    await Promise.all([SecureStore.deleteItemAsync(ACCESS_KEY), SecureStore.deleteItemAsync(REFRESH_KEY)])
  },
}
