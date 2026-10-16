import type { ConfigContext, ExpoConfig } from 'expo/config'

// 비밀값이 아닌 공개 키만 EXPO_PUBLIC_* 로 주입한다 (.env, EAS env)
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '미리펫',
  slug: 'miri-pet',
  // AICO 개인 프로젝트: 회사 조직(lattice-im)이 아닌 개인 Expo 계정 소유
  owner: 'leejaemyung',
  version: '0.1.0',
  orientation: 'portrait',
  // 앱 아이콘·스플래시: 하늘색 배경(#8DC0FD)의 강아지 얼굴 (원본 assets/images/icon.png)
  icon: './assets/images/icon.png',
  scheme: 'miripet',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.aico.miripet',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: '접종증명서와 반려동물 사진을 찍기 위해 카메라를 사용해요.',
      NSPhotoLibraryUsageDescription: '반려동물 사진을 올리기 위해 사진 보관함에 접근해요.',
      NSLocationWhenInUseUsageDescription: '내 주변 동반 가능 장소를 지도에 보여주기 위해 위치를 사용해요.',
    },
  },
  android: {
    package: 'com.aico.miripet',
    // 적응형 아이콘은 런처가 원·사각형으로 잘라내므로 안전 영역(66%) 안에 얼굴을 축소해 둔 이미지를 쓴다
    adaptiveIcon: { foregroundImage: './assets/images/adaptive-icon.png', backgroundColor: '#8DC0FD' },
    permissions: ['CAMERA', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
  },
  plugins: [
    'expo-router',
    'expo-font',
    ['expo-splash-screen', { image: './assets/images/splash-icon.png', imageWidth: 200, backgroundColor: '#8DC0FD' }],
    'expo-secure-store',
    'expo-dev-client',
    'expo-image-picker',
    ['expo-notifications', { color: '#2563EB' }],
    [
      'expo-location',
      { locationWhenInUsePermission: '내 주변 동반 가능 장소를 지도에 보여주기 위해 위치를 사용해요.' },
    ],
    [
      '@react-native-kakao/core',
      {
        nativeAppKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? 'KAKAO_NATIVE_APP_KEY',
        android: { authCodeHandlerActivity: true },
        ios: { handleKakaoOpenUrl: true },
      },
    ],
    [
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? 'com.googleusercontent.apps.placeholder' },
    ],
    [
      '@mj-studio/react-native-naver-map',
      { client_id: process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ?? 'NAVER_MAP_CLIENT_ID' },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: [
            'https://repository.map.naver.com/archive/maven',
            'https://devrepo.kakao.com/nexus/content/groups/public/',
          ],
        },
      },
    ],
  ],
  experiments: { typedRoutes: true },
  runtimeVersion: { policy: 'fingerprint' },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4008/api/v1',
    // EAS 프로젝트 ID는 비밀값이 아니다 (expo.dev/@leejaemyung/miri-pet)
    eas: { projectId: '1521d97e-d5fd-46a3-ab5f-e1953514ba42' },
  },
})
