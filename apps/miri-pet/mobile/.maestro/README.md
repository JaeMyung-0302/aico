# 미리펫 Maestro 스모크 (D12: 출시 전 로컬 실행, CI 미도입)

## 준비
1. 서버: `ENABLE_DEV_LOGIN=true` (NODE_ENV≠production) 로 `pnpm --filter @miri-pet/server dev`
2. 장소 샘플(03 플로우): `pnpm --filter @miri-pet/server admin places:import src/places/import/dev-sample-places.json --allow-dev-samples`
3. 앱: EAS **development** 빌드(dev client) 설치 + `EXPO_PUBLIC_ENABLE_DEV_LOGIN=true pnpm --filter @miri-pet/mobile dev`
   (개발 로그인은 `__DEV__`에서만 보이므로 preview/production 빌드로는 돌릴 수 없다)

## 실행
```bash
cd apps/miri-pet/mobile
maestro test .maestro                                   # iOS 시뮬레이터 (Metro localhost:8082)
maestro test -e METRO_URL=http%3A%2F%2F10.0.2.2%3A8082 .maestro   # Android 에뮬레이터
```
`common/`은 하위 플로우라 단독 실행하지 않는다. 플로우마다 새 닉네임(`e2e` + 타임스탬프)으로 가입한다.

| 파일 | 내용 |
| --- | --- |
| `01-onboarding.yaml` | 개발 로그인 → 약관 동의 → 펫 등록 → 홈(팔로잉/탐색) |
| `02-vaccination-entry-card.yaml` | 접종 기록 추가(광견병) → 입장용 카드 열기 |
| `03-place-report.yaml` | 장소 탭 → 목록 → 장소 상세 → 정보 수정 제보 |
