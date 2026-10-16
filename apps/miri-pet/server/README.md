# 미리펫 서버 — 배포·운영 메모

NestJS + Prisma(PostgreSQL) + Cloudflare R2. 포트: API 4008, DB 5439 (루트 `CLAUDE.md`).

## R2 버킷 설정 (배포 전 1회)

### private 버킷 수명 주기 규칙 — `incoming/` 1일 만료 (필수)

업로드 원본은 private 버킷 `incoming/{mediaId}`에 presigned PUT(5분)으로 들어온다. 서버는 `complete` 때 원본을 지우고,
`complete`를 다시 부르면 같은 키를 또 지운다(멱등). 하지만 **complete 뒤 5분 안에 같은 URL로 다시 PUT하고 complete를 다시
부르지 않으면** 서버는 그 객체를 알 수 없다. 이 잔여물은 R2 수명 주기 규칙으로 지운다.

Cloudflare 대시보드 → R2 → `<private 버킷>` → Settings → Object lifecycle rules → Add rule

| 항목   | 값                                 |
| ------ | ---------------------------------- |
| 이름   | `expire-incoming`                  |
| Prefix | `incoming/`                        |
| 동작   | Delete objects — 업로드 후 **1일** |

`c/`(증명서) 경로에는 수명 주기 규칙을 걸지 않는다(사용자가 지울 때까지 보관).

### 정리 크론 (`media-cleanup`, 매일 04:00 KST)

- 24시간 지난 PENDING 업로드: 행 + incoming 원본 + complete 중간 실패로 최종 위치(`p/{id}/1440·480.jpg`, `c/{owner}/{id}.jpg`)에 남았을 수 있는 객체
- 24시간 넘게 어떤 접종 기록에도 붙지 않은 READY 증명서(`CERTIFICATE`): 행 + R2 객체

R2 삭제 실패는 탈퇴·정리를 막지 않고 `[media] r2 delete failed <bucket:key,...>` 경고 로그만 남긴다. 운영자가 grep해서 재시도한다.

## 업로드 보호 (보안 리뷰 M3·M4)

- `POST /media/uploads`, `POST /media/:id/complete`: 사용자 id 기준 라우트별 **분당 20회**(429). 전역 IP 기준 120회/분과 별개
- 사용자당 PENDING 업로드 **20개** 상한 → 422 `TOO_MANY_PENDING_UPLOADS` (정리 크론이 24시간 뒤 비운다)
- 이미지 재인코딩 동시 2건 + 대기 20건 초과 시 503 `MEDIA_BUSY` (행은 PENDING 유지, 앱이 complete를 다시 부른다)
- 허용 입력 형식: JPEG·PNG·WebP만 (HEIC/HEIF·TIFF·GIF 등은 `INVALID_IMAGE`). 앱은 업로드 전에 항상 JPEG로 변환한다
- presigned URL 응답(업로드·증명서 열람)은 `Cache-Control: no-store`
- 장소 제보 `POST /places/reports`: 사용자당 **시간당 10건**

rate limit 카운터는 프로세스 메모리(단일 인스턴스 전제)라 재시작하면 초기화된다. 인스턴스를 늘리면 Redis 저장소로 바꾼다.

## 푸시 토큰 소유권 (보안 리뷰 L1 — 수용)

`PUT /push-tokens`는 Expo 토큰 문자열 기준 upsert라 **다른 계정이 쓰던 토큰을 등록하면 소유자가 옮겨진다**(같은 기기에서 계정을
바꾸는 정상 흐름). Expo 토큰은 기기 소유를 증명하지 못하므로, 남의 토큰 문자열을 아는 사람이 로그인한 상태로 등록하면 그 기기
알림을 자기 계정 쪽으로 가져올 수 있다. 위험을 수용하는 근거와 완화:

- 등록은 로그인 + 필수 동의를 마친 세션에서만 가능(`@Authenticated()`)
- 토큰은 앱 밖으로 노출되지 않는다(응답·로그에 토큰 원문을 남기지 않음)
- 재할당은 `[push] token reassigned from <oldUserId> to <newUserId>` 경고 로그로 남는다 → 같은 사용자에게서 반복되면 조사

## 증명서 동의 (보안 리뷰 L2)

- `POST /vaccinations/certificate-consent`의 `version`은 공유 상수 `CERTIFICATE_CONSENT_VERSION`과 같아야 한다(아니면 400).
  문구를 바꾸면 `@miri-pet/shared`의 값을 올리고 앱을 같이 배포한다
- `DELETE /vaccinations/certificate-consent` → `200 { withdrawnAt, deletedCertificateCount }`: 동의 철회 + 내 증명서 사진 전부
  (접종 기록에 붙은 것 포함) DB·R2 삭제. 접종 기록은 남는다. 다시 동의할 때까지 증명서 업로드는 403

## 회원 탈퇴 시 파기 범위 (보안 리뷰 H1·L5)

`DELETE /me` 한 트랜잭션: 인증·세션·푸시 토큰·관계·펫·접종 + **내 소유 Media 전체**(게시물·DM·프로필·미완료 업로드, R2는 커밋 뒤)

- 장소 제보의 `reporterId`·자유 입력 `note` 제거(제보 행 자체는 운영 근거로 남김). User는 soft delete라 FK `SetNull`이 걸리지
  않으므로 명시적으로 지운다.

## DM 보안 (Phase 5 보안 리뷰)

### DM 사진 저장 위치 (LOW-5 — D7에 따라 수용)

DM 사진은 피드 사진과 같은 **public 버킷**에 `p/<mediaId>/1440.jpg`·`480.jpg`로 저장한다(서명 URL 없음). 위험을 수용하는 근거와 완화:

- 키의 `mediaId`는 uuid v7(무작위 74비트, `newMediaId`) → 추측으로 찾을 수 없다. URL은 대화 멤버에게만 API로 내려간다
- 업로드 때 서버가 재인코딩해 EXIF(GPS 등)를 지운다(보안 리뷰 M3)
- **운영자가 메시지를 숨기면**(신고 처리 `hide`·신고 누적 자동 숨김) 그 메시지의 Media 행을 지우고 커밋 뒤 R2 객체(본 이미지·썸네일)를
  지운다. 숨김을 해제(`dismiss`)해도 사진은 돌아오지 않는다(텍스트만 복구)
- **보낸 사람이 탈퇴하면** 위 "회원 탈퇴 시 파기 범위"대로 그 사람 소유 DM 사진 Media 행·R2 객체를 지운다
- R2 삭제 실패는 `[media] r2 delete failed <bucket:key,...>` 경고 로그 → 운영자가 grep으로 재시도한다
- TODO: 공개 이미지는 `Cache-Control: immutable`(1년)이라 R2에서 지워도 **Cloudflare CDN 엣지 캐시에 남을 수 있다**. 숨김·탈퇴 시
  URL 단위 CDN purge(Cloudflare API `purge_cache` files)를 붙여야 완전히 사라진다

### 메시지 요청 스팸 (MEDIUM-1)

- 새 메시지 요청(맞팔 아닌 상대 = 상대 상태 REQUEST, 그 대화의 첫 메시지)은 사용자당 **24시간 20건**. 넘으면 `429 { code: 'DM_REQUEST_LIMIT' }`.
  상대가 수락·답장한 대화는 집계에서 빠진다
- `POST /dm/conversations`는 사용자당 **1시간 30회**(`@UserThrottle`), 메시지 전송은 1분 60회

### 소켓 (LOW-1·LOW-2)

- 로그아웃(세션 폐기)·정지(`users:suspend`)·refresh 재사용 감지·탈퇴 시 그 사용자의 소켓을 서버가 모두 끊는다(`DmRealtime` →
  `server.in(user:{id}).disconnectSockets(true)`). 소켓은 세션과 묶여 있지 않아 로그아웃은 다른 기기 소켓도 끊고, 그 기기 앱은
  토큰을 갱신해 다시 연결한다. 운영자 CLI(별도 프로세스)의 정지는 게이트웨이가 없어 즉시 끊지 못하고 아래 만료 시각에 끊긴다
- 모든 소켓은 handshake에 쓴 access token의 `exp`(최대 15분)에 서버가 끊는다 → 앱은 토큰을 갱신해 다시 연결한다
- handshake 제한: 사용자당 동시 소켓 5개(6번째는 `connect_error` `TOO_MANY_CONNECTIONS`), IP당 1분 30회(`RATE_LIMITED`,
  REST와 같은 IP 판정 — `TRUST_PROXY_HOPS > 0`이면 `cf-connecting-ip`). 단일 인스턴스(D5) 메모리 카운터다
- 차단은 소켓을 끊지 않는다(차단 관계에는 이벤트를 보내지 않는다)

### DB 제약

- `Message.mediaId` 유니크(NULL 여러 개 허용): 같은 사진을 동시에 두 메시지에 붙이면 하나는 `422 MEDIA_NOT_USABLE`
- `Notification_dm_request_once_key`: `(userId, actorId) WHERE kind = 'DM_REQUEST'` **부분 유니크 인덱스**. Prisma 스키마로 표현할 수
  없어 마이그레이션 `20261015081251_dm_security_hardening`에 수기 SQL로 있다(`prisma migrate diff`는 이 인덱스를 무시한다).
  동시 요청 알림 충돌은 no-op

## 장소 import

[`src/places/import/README.md`](src/places/import/README.md). 개발용 샘플은 `--allow-dev-samples` + 비운영 환경에서만 들어간다.

## 로컬 실기기 개발 (Android 개발 빌드)

R2·외부 키 없이 Mac + Android 폰(같은 Wi-Fi)으로 전체 흐름을 확인한다.

1. `docker compose -f apps/miri-pet/server/docker-compose.yml up -d` — Postgres(5439) + **S3 호환 저장소 SeaweedFS(9439)**.
   MinIO는 Docker Hub/quay 배포가 막혀 SeaweedFS를 쓴다. 키는 `docker/s3-dev.json`의 로컬 전용 고정값이고 `miripet-public`만 익명 읽기 허용.
2. 서버 `.env`(로컬, 커밋 금지)에 `<LAN IP>`를 넣는다 — 폰이 presigned URL로 저장소에 직접 올리므로 `localhost`가 아니라 LAN 주소여야 한다.
   ```
   ENABLE_DEV_LOGIN=true
   R2_ENDPOINT=http://<LAN IP>:9439
   R2_ACCESS_KEY_ID=miripet
   R2_SECRET_ACCESS_KEY=miripet-dev-storage
   R2_PUBLIC_BASE_URL=http://<LAN IP>:9439/miripet-public
   ```
3. `pnpm --filter @miri-pet/server storage:init` — 버킷 2개 생성(이미 있으면 건너뜀).
4. 서버 실행, 모바일 `.env`에 `EXPO_PUBLIC_API_BASE_URL=http://<LAN IP>:4008/api/v1`, `EXPO_PUBLIC_ENABLE_DEV_LOGIN=true` 후
   `npx expo start --dev-client --lan --port 8082` → 폰 개발 빌드에서 `http://<LAN IP>:8082` 입력.

### 업로드 서명 방식 (Android 대응)

presigned PUT은 **host만 서명**한다. React Native(Android)는 사진을 `Content-Length` 없이 chunked로, `Content-Type`도 바꿔 보내서
헤더를 서명에 묶으면 `SignatureDoesNotMatch`(403)가 난다. 형식·크기는 `complete`에서 다시 검사한다(15MB 초과 → 422 `UPLOAD_TOO_LARGE`,
디코딩 실패 → 422 `INVALID_IMAGE`). 또 SDK 기본값(flexible checksums)이 presigned URL에 **빈 본문의 CRC32**를 넣어 R2가 실제 업로드를
거부하므로 `requestChecksumCalculation: 'WHEN_REQUIRED'`로 끈다(`src/media/r2.client.ts`).

## 배포 (Phase 6)

### 이미지 — `Dockerfile`

- 빌드 컨텍스트는 **레포 루트**: `docker build -f apps/miri-pet/server/Dockerfile -t miri-pet-server .`
  컨텍스트 필터는 `Dockerfile.dockerignore`(BuildKit이 Dockerfile 옆 파일을 자동 사용, 경로는 루트 기준)
- builder: `pnpm install --filter @miri-pet/server...` → shared `tsc` → `prisma generate && nest build` → `pnpm deploy --prod`
- runner: `node:22-bookworm-slim`(glibc — sharp 프리빌드·Prisma `debian-openssl-3.0.x` 엔진), `USER node`, `NODE_ENV=production`
- 시작: `prisma migrate deploy && exec node dist/main` (package.json `start`와 동일). Prisma CLI는 이미지에 6.19.2로 고정 설치
- `HEALTHCHECK`: `GET /api/v1/health` (DB `SELECT 1` 포함) — 30초 간격, 시작 유예 40초
- 운영 CLI: `docker exec miri-pet-server node dist/admin/admin.cli.js <command>`

### 서비스 — 루트 `docker-compose.yml`

| 서비스 | 바인딩 | 메모리 | 비고 |
| --- | --- | --- | --- |
| `miri-pet-server` | `127.0.0.1:4008` | 512m | `env_file: .env.miri-pet`, `TRUST_PROXY_HOPS=2`, `init: true`, 로그 10MB×3 |
| `miri-pet-db` | `127.0.0.1:5439` | 384m | postgres:16-alpine, 볼륨 `miri-pet-data`, `env_file: .env.miri-pet-db` |

- 두 포트 모두 localhost에만 열린다 → 외부는 호스트 리버스 프록시로만 들어온다(프록시를 우회하면 `X-Forwarded-For` 위조 가능)
- `POSTGRES_PASSWORD`는 **볼륨을 처음 만들 때만** 적용된다. 나중에 비밀번호를 바꾸려면 `ALTER USER miripet PASSWORD ...` 후 시크릿 갱신
- `/app/.env.miri-pet*` 두 파일은 배포 워크플로가 매번 다시 쓴다(umask 077). 손으로 고치지 않는다
- 첫 배포 전 호스트: 루트 `docker-compose.yml`을 `/app`에 반영, ghcr 패키지가 private이면 `docker login ghcr.io` 1회

### CI/CD — `.github/workflows/deploy-miri-pet.yml`

- 트리거: `apps/miri-pet/server/**`, `packages/miri-pet-shared/**` 변경 (PR = 테스트만, main push·수동 = 테스트 + 배포)
- `test` 잡: lint → check-types → 단위 → 통합(서비스 컨테이너 postgres:16, `miripet_test`)
- `deploy` 잡: ghcr 이미지(`latest` + `<sha>`) → SSH로 env 파일 작성 → `docker compose up` → 컨테이너 `healthy`까지 최대 150초 대기(실패 시 로그 100줄 출력 후 실패)
- GitHub Environment **`miri-pet`** 에 등록:

| 종류 | 이름 |
| --- | --- |
| secrets | `SERVER_HOST`, `SERVER_SSH_KEY`, `MIRI_PET_DB_PASSWORD`(URL-safe: `openssl rand -hex 24`), `JWT_SECRET`(`openssl rand -base64 48`), `KAKAO_NATIVE_APP_KEY`, `KAKAO_ADMIN_KEY`, `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `EXPO_ACCESS_TOKEN`, `POSTHOG_API_KEY`, `SENTRY_DSN` |
| vars | `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_BASE_URL`, `POSTHOG_HOST`, `ENABLE_GPS_LOCATION` |

`ENABLE_DEV_LOGIN`은 운영 env에 넣지 않는다(넣어도 production에서는 무시 → `/auth/dev` 404, 이미지 스모크로 확인).

### 리버스 프록시 (Cloudflare → 호스트 프록시 → 컨테이너)

- `TRUST_PROXY_HOPS=2` 고정(compose). 프록시 홉 구성이 바뀌면 이 값을 같이 바꾼다
- **socket.io(DM)**: 경로 `/socket.io/`를 `127.0.0.1:4008`로 넘기면서 WebSocket Upgrade를 통과시켜야 한다.
  Cloudflare 대시보드 → Network → WebSockets **On**. nginx 예시:

```nginx
location /socket.io/ {
  proxy_pass http://127.0.0.1:4008;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_read_timeout 75s;   # socket.io ping(25s) + 여유
}
location / {
  proxy_pass http://127.0.0.1:4008;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

- 확인: `npx wscat -c "wss://<도메인>/socket.io/?EIO=4&transport=websocket"` → `0{"sid":...}` 수신

### DB 백업 — `scripts/pg-backup.sh`

매일 `pg_dump`(docker exec) → gzip → R2 private 버킷 `backups/db/miripet-<UTC>.sql.gz`, **14일** 보관(스크립트가 지난 것 삭제).

1. 호스트에 aws-cli v2 설치(`sudo snap install aws-cli --classic`), 스크립트를 `/app/scripts/pg-backup.sh`로 복사 + `chmod 700`
2. R2 API 토큰: 백업 버킷 **Object Read & Write** 전용으로 새로 발급(서버 런타임 키와 분리)
3. `/app/.env.miri-pet-backup` (`chmod 600`):
   ```
   R2_ACCOUNT_ID=...
   R2_BACKUP_ACCESS_KEY_ID=...
   R2_BACKUP_SECRET_ACCESS_KEY=...
   R2_BACKUP_BUCKET=miripet-private
   ```
4. 스케줄 (04:15 KST, 미디어 정리 크론 04:00 뒤). systemd timer 권장:
   ```ini
   # /etc/systemd/system/miri-pet-backup.service
   [Service]
   Type=oneshot
   ExecStart=/app/scripts/pg-backup.sh
   # /etc/systemd/system/miri-pet-backup.timer
   [Timer]
   OnCalendar=*-*-* 04:15:00 Asia/Seoul
   Persistent=true
   [Install]
   WantedBy=timers.target
   ```
   `sudo systemctl enable --now miri-pet-backup.timer`. cron을 쓰면 서버 시간대(UTC)로: `15 19 * * * /app/scripts/pg-backup.sh >> /var/log/miri-pet-backup.log 2>&1`
5. 이중 안전장치: R2 수명 주기 규칙 `expire-db-backups` — Prefix `backups/db/`, 업로드 후 **15일** 삭제
6. 로컬 검증(업로드 없이): `BACKUP_DB_NAME=miripet_dev ./scripts/pg-backup.sh --local-only /tmp/x.sql.gz`

복원(새 DB에, 덤프와 같은 메이저 이상 psql 필요):
```bash
aws s3 cp s3://miripet-private/backups/db/miripet-<stamp>.sql.gz . --endpoint-url https://<account>.r2.cloudflarestorage.com
docker exec miri-pet-db createdb -U miripet miripet_restore
gunzip -c miripet-<stamp>.sql.gz | docker exec -i miri-pet-db psql -U miripet -d miripet_restore -v ON_ERROR_STOP=1
```

### 관측 (D11)

- 서버 Sentry: `src/instrument.ts`(main.ts 첫 import) — `SENTRY_DSN` 없으면 no-op. 5xx만 `GlobalExceptionFilter`에서 보고하고
  응답의 `x-request-id`와 같은 값을 `requestId` 태그로 단다. `sendDefaultPii: false`, 트레이싱 기본 0
- 컨테이너 env는 `process.env`로 바로 들어오므로 `.env` 파일 로딩 전에 초기화돼도 된다(로컬 `pnpm dev`는 `.env`의 DSN을 읽지 않음)
- 서버 PostHog: `POSTHOG_API_KEY` 없으면 no-op (`EventsService`)
