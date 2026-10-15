// 시뮬레이터에서 카카오/Google 키 없이 로그인하기 위한 개발용 진입점.
// 개발 빌드(__DEV__) + EXPO_PUBLIC_ENABLE_DEV_LOGIN=true 둘 다일 때만 보인다(서버도 ENABLE_DEV_LOGIN=true여야 동작)
export const isDevLoginEnabled = (isDev: boolean, flag: string | undefined): boolean => isDev && flag === 'true'
