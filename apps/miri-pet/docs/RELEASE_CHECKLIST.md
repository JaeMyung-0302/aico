# 미리펫 v1 출시 체크리스트

외부 계정이나 실기기가 있어야 끝나는 일을 한곳에 모은다. 코드로 끝낼 수 있는 일(이미지, 워크플로, 백업 스크립트, Sentry/PostHog no-op 연결,
Maestro 플로우)은 Phase 6에서 끝냈다. 배포 상세는 [`server/README.md` §배포](../server/README.md#배포-phase-6).

표기: `[ ]` 할 일 · **(차단)** 이 항목이 끝나야 스토어에 제출할 수 있음

---

## 1. 계정·키 발급

| # | 대상 | 할 일 | 넣을 곳 |
| --- | --- | --- | --- |
| [ ] 1.1 | Apple Developer Program | 가입(연 $99), 번들 ID `com.aico.miripet` 등록, App Store Connect 앱 생성 **(차단)** | EAS credentials |
| [ ] 1.2 | Google Play Console | 가입($25), 패키지 `com.aico.miripet` 앱 생성, 내부 테스트 트랙 **(차단)** | EAS Submit 서비스 계정 키 |
| [ ] 1.3 | Expo / EAS | 프로젝트 생성 → `EAS_PROJECT_ID`, 빌드 프로필별 EAS env(`EXPO_PUBLIC_*`) 등록 | `mobile/.env`, EAS env |
| [ ] 1.4 | Expo access token | 푸시 발송용 토큰(Enhanced Security를 켜면 필수) | GitHub secret `EXPO_ACCESS_TOKEN` |
| [ ] 1.5 | Kakao Developers | 앱 생성, 네이티브 앱 키, iOS 번들 ID·Android 키 해시 등록, **OpenID Connect 활성화**(서버가 id_token `aud` 검증), **Admin 키**(탈퇴 시 unlink) | 앱: `EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY` / 서버: `KAKAO_NATIVE_APP_KEY`, `KAKAO_ADMIN_KEY` |
| [ ] 1.6 | Google Cloud OAuth | 클라이언트 3개: Web(서버 aud), iOS(URL scheme), Android(SHA-1 — EAS 키와 Play 앱 서명 키 **둘 다**) | 앱: `EXPO_PUBLIC_GOOGLE_*` / 서버: `GOOGLE_{WEB,IOS,ANDROID}_CLIENT_ID` |
| [ ] 1.7 | NCP Maps (네이버 지도) | Application 등록, Mobile Dynamic Map, iOS 번들 ID·Android 패키지 등록 | `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID` |
| [ ] 1.8 | Cloudflare R2 | 버킷 `miripet-public`, `miripet-private` 생성 / 서버용 API 토큰 / **백업 전용 토큰**(private 버킷 R/W) | GitHub secrets `R2_*`, 호스트 `/app/.env.miri-pet-backup` |
| [ ] 1.9 | R2 수명 주기 규칙 | private 버킷: `incoming/` 1일, `backups/db/` 15일 ([server/README](../server/README.md#r2-버킷-설정-배포-전-1회)) | Cloudflare 대시보드 |
| [ ] 1.10 | R2 커스텀 도메인 | public 버킷에 `img.aico-app.com` 연결 | var `R2_PUBLIC_BASE_URL` |
| [ ] 1.11 | PostHog Cloud | 프로젝트 생성(US/EU 지역 결정 → 처리방침 국외 이전 표에 반영), 서버·앱 키 | secret `POSTHOG_API_KEY`, var `POSTHOG_HOST`, `EXPO_PUBLIC_POSTHOG_API_KEY`·`_HOST` |
| [ ] 1.12 | Sentry | 서버·앱 프로젝트 2개, DSN | secret `SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_ENVIRONMENT` |
| [ ] 1.13 | Sentry 소스맵(선택) | `@sentry/react-native/expo` config plugin + `getSentryExpoConfig` metro 설정 + EAS secret `SENTRY_AUTH_TOKEN`. 네이티브 변경이라 새 빌드가 필요하다. 지금은 JS 초기화만 되어 있어 앱 스택 트레이스가 난독화된 채로 보인다 | `app.config.ts`, `metro.config.js` |
| [ ] 1.14 | 공공데이터포털 / TourAPI | 반려동물 동반 여행지 API 키 → 정규화 스크립트 연결 | `server/src/places/import/README.md` |
| [ ] 1.15 | GitHub Environment `miri-pet` | 위 secrets/vars와 `SERVER_HOST`, `SERVER_SSH_KEY`, `MIRI_PET_DB_PASSWORD`, `JWT_SECRET` 등록 ([목록](../server/README.md#cicd--githubworkflowsdeploy-miri-petyml)) | GitHub |

## 2. 서버·인프라 (Lightsail)

- [ ] 2.1 `free -m`으로 메모리 여유 확인. 미리펫 server 512m + db 384m가 더 들어가는지 본다(부족하면 인스턴스 상향)
- [ ] 2.2 루트 `docker-compose.yml`을 `/app`에 반영, ghcr 패키지가 private이면 `docker login ghcr.io`
- [ ] 2.3 호스트 리버스 프록시: api 도메인 → `127.0.0.1:4008`, **`/socket.io/` WebSocket Upgrade 통과**, Cloudflare WebSockets On, `wscat`으로 확인 (plan Step 5.0)
- [ ] 2.4 `TRUST_PROXY_HOPS=2`가 실제 홉 수와 맞는지 확인: 요청 1건을 보내고 서버가 본 클라이언트 IP(rate limit 키)가 내 공인 IP인지 본다
- [ ] 2.5 첫 배포(main push 또는 workflow_dispatch) → 잡 로그에서 `healthy` 확인 → `curl https://<api>/api/v1/health` 200, `POST /api/v1/auth/dev` 404
- [ ] 2.6 백업: aws-cli 설치, 스크립트 복사, env 파일, systemd timer 활성화 → 수동 1회 실행 후 R2 객체 확인 → **복원 리허설 1회** (README 복원 절차)
- [ ] 2.7 Sentry 테스트 이벤트: 서버에서 일부러 500을 1건 내고, Sentry `requestId` 태그가 응답 `x-request-id`와 같은지 확인
- [ ] 2.8 `turbo.json` env 목록에 `KAKAO_ADMIN_KEY`를 추가하고 `configuration.ts`의 TODO/disable 제거
- [ ] 2.9 로컬 Docker 정리(선택): Phase 6 스모크용 DB `miripet_prod_smoke`가 로컬 `miri-pet-db`에 남아 있다. `DROP DATABASE miripet_prod_smoke`

## 3. 실기기 검증 (Phase별 미검증 항목)

EAS **development** 빌드(iOS·Android)를 설치한 실기기 기준이다. 시뮬레이터로 확인할 수 없는 것만 모았다.

| Phase | 항목 |
| --- | --- |
| 0 | [ ] `eas build --profile development` iOS/Android 성공 · [ ] `npx expo-doctor` 실패 0 |
| 1 | [ ] 카카오 로그인(카카오톡 앱 전환, 계정 로그인 두 경로) · [ ] Google 로그인(iOS·Android) · [ ] 탈퇴 → 카카오 연결 끊김 확인(카카오 계정 > 연결된 서비스) |
| 2 | [ ] 카메라로 증명서 촬영 → 업로드 → 입장용 카드에서 원본 열람 · [ ] 갤러리 사진 업로드(HEIC 원본 → JPEG 변환) · [ ] 푸시 토큰 발급·등록 · [ ] D-7/D-1 접종 리마인더 푸시 실제 수신(10:00 KST) |
| 3 | [ ] 네이버 지도 타일 표시(iOS·Android, 인증 실패 시 회색 화면) · [ ] "지도 앱으로 길찾기" 외부 앱 전환 · [ ] (GPS를 켜는 경우) 위치 권한 흐름 |
| 4 | [ ] 기기 2대: 게시 → 팔로우 → 좋아요 → 상대 기기 푸시와 알림함 → 차단 후 서로 안 보임 |
| 5 | [ ] 기기 2대 DM: 실시간 수신(WebSocket, 운영 프록시 경유) · 앱 백그라운드 시 푸시 · 요청함 수락 · 차단 후 전송 불가 · 비행기 모드 → 복구 시 재동기화 |
| 6 | [ ] Maestro 3플로우 로컬 통과 (`mobile/.maestro/README.md`) · [ ] Sentry 앱 테스트 크래시 수신 · [ ] PostHog에 `onboarding_completed` 등 이벤트가 **userId distinctId로만** 들어오는지 |

## 4. 콘텐츠·법무

- [ ] 4.1 **실제 동반 장소 300곳 이상** import (공공데이터·TourAPI 정규화 → `admin places:import`). 개발 샘플(`[샘플]`)은 운영 DB에 넣지 않는다 (plan Phase 3 런치 게이트)
- [ ] 4.2 약관·개인정보 처리방침·위치기반서비스 약관 **확정본**으로 교체 (`server/public/legal/*.html`의 `[… 확정 필요]` 전부): 시행일, 사업자 정보, 고객센터 이메일, 보존 기간, 게시물·펫 기록 파기 범위
- [ ] 4.3 처리방침 **국외 이전 고지** 확정: Cloudflare(R2), Expo(650 Industries), PostHog, Sentry 각각 이전 국가·일시·방법·항목 (1.11의 PostHog 지역 선택 반영)
- [ ] 4.4 **위치기반서비스사업 신고 여부 결정**. 신고 전에는 `ENABLE_GPS_LOCATION=false`를 유지한다(지역 프리셋만). 신고하면 번호·책임자를 위치약관에 적고 true로 바꾼다
- [ ] 4.5 약관 버전이 바뀌면 재동의를 판정하는 로직 (`server/src/common/consents.ts` TODO(Phase 6))
- [ ] 4.6 커뮤니티 이용 수칙 문서(`/legal/community`) 작성 → 동의 화면 "보기" 링크 연결 (mobile `ConsentForm.tsx`, `legal-urls.ts` TODO)
- [ ] 4.7 스토어 등록 정보: 개인정보 처리방침 URL(`/legal/privacy`), App Privacy / Play 데이터 보안 양식, 연령 등급(UGC·DM 포함), UGC 신고·차단 기능 설명

## 5. 출시 전 코드 작업

- [ ] 5.1 **Apple 로그인 재도입**. 카카오·Google 같은 제3자 로그인이 있으면 App Store 심사 가이드라인 4.8 대상이다. iOS 제출 전에 `expo-apple-authentication` 버튼, 서버 검증, 탈퇴 시 revoke를 추가한다 **(iOS 차단)**
- [ ] 5.2 `expo-brightness` 추가: 입장용 카드 화면에서 밝기를 최대로(매장 직원에게 보여줄 때). 네이티브 의존성이라 새 빌드가 필요하다
- [ ] 5.3 날짜 선택기 추가(`@react-native-community/datetimepicker` 등). 지금은 생일·접종일을 `YYYY-MM-DD` 숫자로 입력받는다. 네이티브 의존성이라 새 빌드가 필요하다
- [ ] 5.4 **스파이크 화면 삭제**: `mobile/src/app/spike.tsx` (Phase 0 종료 시 삭제 예정이었음)
- [ ] 5.5 로그아웃 시 푸시 토큰 해제 연결 (`util-push-registration.ts` TODO)
- [ ] 5.6 (선택) 앱 Sentry에 사용자 id 태그. 처리방침에 "앱 내부 사용자 id"로 적혀 있다. 넣는다면 `Sentry.setUser({ id })`만 쓴다(이메일·닉네임 금지)
- [ ] 5.7 production 빌드 env 확인: `EXPO_PUBLIC_API_BASE_URL` = 운영 도메인, `EXPO_PUBLIC_ENABLE_DEV_LOGIN` 미설정

## 6. 제출

- [ ] 6.1 `eas build --profile production` (iOS·Android) → `eas submit` → TestFlight / Play 내부 테스트
- [ ] 6.2 내부 테스터 1주: 크래시 0, 핵심 플로우(온보딩·접종·장소·피드·DM) 수동 확인
- [ ] 6.3 EAS Update 채널 연결 확인(`runtimeVersion: fingerprint`), JS 핫픽스 1건 리허설
- [ ] 6.4 심사 제출. 리뷰어용 카카오/Google 테스트 계정을 준비한다(운영 빌드에는 개발 로그인이 없다)
