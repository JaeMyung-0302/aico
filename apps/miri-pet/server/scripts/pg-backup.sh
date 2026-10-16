#!/usr/bin/env bash
# 미리펫 DB 일일 백업: pg_dump(docker exec) → gzip → R2(S3 호환) private 버킷 업로드 → 보관 기간 지난 백업 삭제
#
# 사용법 (Lightsail 호스트, /app):
#   ./pg-backup.sh                       # 덤프 + 업로드 + 보관 정리
#   ./pg-backup.sh --local-only FILE     # 덤프만 FILE에 저장 (업로드·정리 생략, 로컬 검증용)
#
# 설정 (환경변수, 기본값):
#   BACKUP_ENV_FILE=/app/.env.miri-pet-backup  존재하면 먼저 읽는다 (chmod 600, 커밋 금지)
#   BACKUP_DB_CONTAINER=miri-pet-db  BACKUP_DB_USER=miripet  BACKUP_DB_NAME=miripet
#   R2_ACCOUNT_ID, R2_BACKUP_ACCESS_KEY_ID, R2_BACKUP_SECRET_ACCESS_KEY  (백업 버킷 전용 토큰 권장)
#   R2_BACKUP_BUCKET=miripet-private  BACKUP_PREFIX=backups/db  BACKUP_RETENTION_DAYS=14
# 필요 도구: docker, gzip, aws(cli v2)
set -euo pipefail

ENV_FILE="${BACKUP_ENV_FILE:-/app/.env.miri-pet-backup}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

DB_CONTAINER="${BACKUP_DB_CONTAINER:-miri-pet-db}"
DB_USER="${BACKUP_DB_USER:-miripet}"
DB_NAME="${BACKUP_DB_NAME:-miripet}"
BUCKET="${R2_BACKUP_BUCKET:-miripet-private}"
PREFIX="${BACKUP_PREFIX:-backups/db}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

log() { printf '[pg-backup] %s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

# GNU date(Ubuntu)와 BSD date(macOS) 모두 지원
days_ago_stamp() {
  date -u -d "-$1 days" +%Y%m%dT%H%M%SZ 2>/dev/null || date -u -v-"$1"d +%Y%m%dT%H%M%SZ
}

dump_to() {
  local out="$1"
  # pipefail: pg_dump 실패 시 전체 실패. 빈 파일은 남기지 않는다
  if ! docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges | gzip -9 > "$out"; then
    rm -f "$out"
    log "dump failed"
    return 1
  fi
  gzip -t "$out"
  log "dump ok $(wc -c < "$out" | tr -d ' ') bytes → $out"
}

if [ "${1:-}" = "--local-only" ]; then
  [ -n "${2:-}" ] || { echo 'usage: pg-backup.sh --local-only FILE' >&2; exit 2; }
  dump_to "$2"
  exit 0
fi

: "${R2_ACCOUNT_ID:?R2_ACCOUNT_ID is required}"
: "${R2_BACKUP_ACCESS_KEY_ID:?R2_BACKUP_ACCESS_KEY_ID is required}"
: "${R2_BACKUP_SECRET_ACCESS_KEY:?R2_BACKUP_SECRET_ACCESS_KEY is required}"

export AWS_ACCESS_KEY_ID="$R2_BACKUP_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_BACKUP_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION=auto
# aws-cli v2.23+ 기본 체크섬 헤더와 R2 호환 문제 회피
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="miripet-${STAMP}.sql.gz"
dump_to "$WORK_DIR/$FILE"

aws s3 cp "$WORK_DIR/$FILE" "s3://${BUCKET}/${PREFIX}/${FILE}" --endpoint-url "$ENDPOINT" --only-show-errors
log "uploaded s3://${BUCKET}/${PREFIX}/${FILE}"

# 보관 정리: 키 이름의 UTC 타임스탬프가 기준보다 오래된 것만 지운다 (R2 수명 주기 규칙과 이중 안전장치)
CUTOFF="miripet-$(days_ago_stamp "$RETENTION_DAYS").sql.gz"
aws s3 ls "s3://${BUCKET}/${PREFIX}/" --endpoint-url "$ENDPOINT" | awk '{print $4}' | while read -r key; do
  case "$key" in
    miripet-*.sql.gz) ;;
    *) continue ;;
  esac
  if [[ "$key" < "$CUTOFF" ]]; then
    aws s3 rm "s3://${BUCKET}/${PREFIX}/${key}" --endpoint-url "$ENDPOINT" --only-show-errors
    log "pruned ${key}"
  fi
done

log "done"
