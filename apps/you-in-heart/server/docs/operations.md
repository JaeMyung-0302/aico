# You-In-Heart 서버 운영 런북

운영 위치: AWS Lightsail(서울) `/app`, 루트 `docker-compose.yml`의 `you-in-heart-server`(127.0.0.1:4009, 512MB)와 `you-in-heart-db`.
도메인: `youinheart-api.aico-app.com` (Cloudflare 프록시 → 호스트 리버스 프록시 → 4009).

## 1. 최초 준비 (계정 생성 후 1회)

1. Cloudflare R2 버킷 `youinheart-private` 생성 (공개 접근 없음)
2. R2 수명 주기 규칙 3개
   | 접두사 | 동작 |
   |--------|------|
   | `incoming/` | 1일 후 삭제 (업로드 중 표시용 후보) |
   | `exports/` | 7일 후 삭제 (내보내기 zip) |
   | `backups/db/` | 15일 후 삭제 (pg-backup.sh 14일 정리의 안전망) |
3. GitHub Environment `you-in-heart`에 secrets 등록: `SERVER_HOST`, `SERVER_SSH_KEY`, `YOU_IN_HEART_DB_PASSWORD`(`openssl rand -hex 24`), `JWT_SECRET`(`openssl rand -base64 48`), `KAKAO_NATIVE_APP_KEY`, `KAKAO_REST_API_KEY`, `KAKAO_ADMIN_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `EXPO_ACCESS_TOKEN`, `SENTRY_DSN`(선택). vars: `R2_PRIVATE_BUCKET=youinheart-private`
4. Cloudflare DNS `youinheart-api` → Lightsail 고정 IP (프록시 켬)
5. 저장소 변수 `YOU_IN_HEART_DEPLOY_ENABLED=true` → main 머지 시 배포 잡 실행
6. 배포 후 확인: `curl -s -o /dev/null -w '%{http_code}' https://youinheart-api.aico-app.com/api/v1/health` → `200`

`.env.you-in-heart`, `.env.you-in-heart-db`는 배포 워크플로가 `umask 077`로 만든다. 직접 편집하지 않는다.

## 2. DB 백업

- 스크립트: `apps/you-in-heart/server/scripts/pg-backup.sh`를 호스트 `/app/you-in-heart/pg-backup.sh`로 복사 (`chmod 700`)
- 백업 전용 R2 토큰을 `/app/.env.you-in-heart-backup`에 둔다 (`chmod 600`):
  ```
  R2_ACCOUNT_ID=...
  R2_BACKUP_ACCESS_KEY_ID=...
  R2_BACKUP_SECRET_ACCESS_KEY=...
  ```
- 호스트 crontab (`crontab -e`, 03:30 UTC = 12:30 KST, purge 04:00 KST와 겹치지 않음):
  ```
  30 3 * * * /app/you-in-heart/pg-backup.sh >> /app/you-in-heart/pg-backup.log 2>&1
  ```
- 확인: 로그 마지막 줄 `done`, `aws s3 ls s3://youinheart-private/backups/db/ --endpoint-url https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`에 파일 1개 이상
- 보관 14일. 연결 해제 후 삭제된 커플의 데이터도 백업에는 최대 14일 더 남는다 (개인정보 처리방침에 명시)

## 3. 백업 복원

1. 서버 정지: `docker compose stop you-in-heart-server`
2. 백업 내려받기 후 복원:
   ```
   gunzip -c youinheart-<STAMP>.sql.gz | docker exec -i you-in-heart-db psql -U youinheart -d youinheart
   ```
3. **purge 재적용 (필수)**: 백업 시점 이후 삭제된 커플이 되살아나므로 원장 기준으로 다시 지운다
   ```
   docker compose run --rm you-in-heart-server node dist/couples/purge-replay.cli.js
   ```
   (로컬: `pnpm --filter @you-in-heart/server purge:replay`)
4. 확인 SQL — 결과가 0이어야 한다:
   ```sql
   SELECT count(*) FROM "Couple" c JOIN "PurgedCouple" p ON p.id = c.id;
   ```
   주의: `PurgedCouple` 행도 백업 시점 기준이다. 복원 이후 삭제분은 R2 `system/purge-ledger/` 원장이 기준이며 purge-replay가 원장 전체를 읽는다.
5. 서버 시작: `docker compose up -d you-in-heart-server`

## 4. purge 긴급 정지

삭제 대상이 이상하거나(`PurgedCouple`·원장과 coupleId 불일치) `PurgeFailure`가 이틀 연속 남으면:

1. GitHub vars `PURGE_ENABLED`를 `false`로 바꾸거나, 호스트 `/app/.env.you-in-heart`의 `PURGE_ENABLED=false`로 수정
2. `docker compose up -d --force-recreate you-in-heart-server`
3. 로그 확인: `docker logs --tail 200 you-in-heart-server | grep -i purge`

## 5. 주간 점검 SQL

```sql
-- 남은 purge 실패 (0이어야 정상)
SELECT count(*) FROM "PurgeFailure" WHERE "resolvedAt" IS NULL;
-- 주간 기록 생성 수 (Primary KPI)
SELECT count(*) FROM "EventLog" WHERE name = 'memory_created' AND "createdAt" > now() - interval '7 days';
```

메모리 확인: `docker stats --no-stream you-in-heart-server` → 512MiB 미만.
