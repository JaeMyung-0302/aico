// 실기기 없이 테스트한다: 네이티브 SDK 경계(카카오)만 전역으로 대체한다. 파일별 jest.mock이 있으면 그쪽이 우선
jest.mock('@react-native-kakao/core', () => ({ initializeKakaoSDK: jest.fn(async () => undefined) }))
jest.mock('@react-native-kakao/user', () => ({
  login: jest.fn(async () => ({ idToken: null })),
  logout: jest.fn(async () => undefined),
}))
