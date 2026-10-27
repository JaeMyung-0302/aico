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
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}))
// 사진 보관함·파일·이미지 처리(네이티브)는 빈 보관함으로 대체한다. 동작은 각 테스트가 jest.mock 으로 정한다
jest.mock('expo-media-library/legacy', () => ({
  MediaType: { photo: 'photo', video: 'video' },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  SortBy: { creationTime: 'creationTime' },
  getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true, status: 'granted' })),
  getAssetsAsync: jest.fn(async () => ({ assets: [], endCursor: '', hasNextPage: false, totalCount: 0 })),
  getAssetInfoAsync: jest.fn(async () => null),
  saveToLibraryAsync: jest.fn(async () => undefined),
}))
jest.mock('expo-file-system', () => {
  class File {
    constructor(...uris) {
      this.uri = uris.map((part) => (typeof part === 'string' ? part : part.uri)).join('/')
      this.size = 0
    }
    upload() {
      return Promise.resolve({ status: 200, body: '', headers: {} })
    }
    delete() {}
    move() {}
    open() {
      return { readBytes: () => new Uint8Array(0), close: () => undefined }
    }
  }
  File.downloadFileAsync = jest.fn(async (_url, destination) => destination)
  return { File, Paths: { cache: { uri: 'file:///cache' } } }
})
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  ImageManipulator: { manipulate: jest.fn() },
}))
// expo-image 는 네이티브 뷰 → source(cacheKey 포함)를 그대로 받는 View 로 대체한다
jest.mock('expo-image', () => {
  const { View } = require('react-native')
  return { Image: View }
})
