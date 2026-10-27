// 실기기 없이 테스트한다: 네이티브 SDK 경계(카카오)만 전역으로 대체한다. 파일별 jest.mock이 있으면 그쪽이 우선
jest.mock('@react-native-kakao/core', () => ({ initializeKakaoSDK: jest.fn(async () => undefined) }))
jest.mock('@react-native-kakao/user', () => ({
  login: jest.fn(async () => ({ idToken: null })),
  logout: jest.fn(async () => undefined),
}))
// 기기 저장소(AsyncStorage)는 라이브러리가 제공하는 메모리 구현으로 대체한다
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
// 푸시(네이티브)는 권한·토큰을 받지 않은 상태로 대체한다 (등록 로직은 register-push-token.test 가 따로 검사)
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false, status: 'denied' })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false, status: 'denied' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ type: 'expo', data: '' })),
  setNotificationChannelAsync: jest.fn(async () => null),
}))
