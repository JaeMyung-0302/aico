import type { ConfigContext, ExpoConfig } from 'expo/config'

// 앱 식별자는 HITL #2에서 확정, 출시 후 변경 금지 (Android 패키지에는 하이픈 불가)
const BUNDLE_ID = 'com.aico.youinheart'
const APP_GROUP = 'group.com.aico.youinheart'
const PHOTO_PERMISSION = '추억에 사진을 담고, 사진의 촬영 위치로 다녀온 곳을 찾기 위해 사진 보관함에 접근해요.'

// 비밀값이 아닌 공개 키만 EXPO_PUBLIC_* 로 주입한다 (.env, EAS env)
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'You-In-Heart',
  slug: 'you-in-heart',
  // AICO 개인 프로젝트: 개인 Expo 계정 소유 (미리펫과 동일)
  owner: 'leejaemyung',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'youinheart',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: false,
    // 위젯 타깃(targets/widget)이 같은 App Group의 snapshot을 읽는다
    entitlements: { 'com.apple.security.application-groups': [APP_GROUP] },
    infoPlist: {
      NSPhotoLibraryUsageDescription: PHOTO_PERMISSION,
      NSFaceIDUsageDescription: '앱 잠금을 풀기 위해 Face ID를 사용해요.',
    },
  },
  android: {
    package: BUNDLE_ID,
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-dev-client',
    ['expo-notifications', { color: '#CC3355' }],
    [
      'expo-media-library',
      {
        photosPermission: PHOTO_PERMISSION,
        savePhotosPermission: '원본 사진을 기기에 저장하기 위해 사용해요.',
        isAccessMediaLocationEnabled: true,
        // 사진만 읽는다 — Android 13+ 영상·오디오 권한은 요청하지 않는다
        granularPermissions: ['photo'],
      },
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
      '@mj-studio/react-native-naver-map',
      {
        client_id: process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ?? 'NAVER_MAP_CLIENT_ID',
      },
    ],
    '@bacons/apple-targets',
    [
      'react-native-android-widget',
      {
        // 이름은 src/modules/widget/android/DdayWidget.tsx WIDGET_NAMES 와 같아야 한다.
        // 30분(안드로이드 최소)마다 다시 그린다. D-day 계산은 위젯이 스냅샷의 사귄 날로 직접 한다 → 자정 후 30분 안에 바뀐다
        widgets: [
          {
            name: 'DdayWidget',
            label: 'D-day',
            description: '함께한 날을 보여줘요',
            minWidth: '110dp',
            minHeight: '40dp',
            targetCellWidth: 2,
            targetCellHeight: 1,
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
          {
            name: 'DdayWidgetWide',
            label: 'D-day (넓게)',
            description: '함께한 날과 다음 기념일을 보여줘요',
            minWidth: '250dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
    [
      'expo-share-intent',
      {
        // 카톡 메시지 텍스트 공유 + 스크린샷 1장 (Phase 4D)
        iosActivationRules: {
          NSExtensionActivationSupportsText: true,
          NSExtensionActivationSupportsImageWithMaxCount: 1,
        },
        androidIntentFilters: ['text/*', 'image/*'],
      },
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
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4009/api/v1',
    appGroup: APP_GROUP,
    // EAS 프로젝트 ID는 실기기 확인 단계에서 `eas init`으로 채운다(EAS_PROJECT_ID). 없으면 푸시 토큰 등록을 건너뛴다
    ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
  },
})
