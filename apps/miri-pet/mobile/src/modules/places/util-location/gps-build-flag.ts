// 빌드 플래그(EAS env). 서버 원격 플래그(GET /config)와 둘 다 true일 때만 "내 위치"를 노출한다 (D4)
export const isGpsBuildEnabled = (): boolean => process.env.EXPO_PUBLIC_FEATURE_GPS === 'true'
