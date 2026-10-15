import type { ConfigContext, ExpoConfig } from 'expo/config'

// 비밀값이 아닌 공개 키만 EXPO_PUBLIC_* 로 주입한다 (.env, EAS env)
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '미리펫',
  slug: 'miri-pet',
  version: '0.1.0',
  orientation: 'portrait',
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
    permissions: ['CAMERA', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-dev-client',
    'expo-image-picker',
    ['expo-notifications', { color: '#2563EB' }],
    ['expo-location', { locationWhenInUsePermission: '내 주변 동반 가능 장소를 지도에 보여주기 위해 위치를 사용해요.' }],
    [
      '@react-native-kakao/core',
      { nativeAppKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY ?? 'KAKAO_NATIVE_APP_KEY', android: { authCodeHandlerActivity: true }, ios: { handleKakaoOpenUrl: true } },
    ],
    ['@react-native-google-signin/google-signin', { iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? 'com.googleusercontent.apps.placeholder' }],
    ['@mj-studio/react-native-naver-map', { client_id: process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ?? 'NAVER_MAP_CLIENT_ID' }],
    ['expo-build-properties', { android: { extraMavenRepos: ['https://repository.map.naver.com/archive/maven', 'https://devrepo.kakao.com/nexus/content/groups/public/'] } }],
  ],
  experiments: { typedRoutes: true },
  runtimeVersion: { policy: 'fingerprint' },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4008/api/v1',
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
})
