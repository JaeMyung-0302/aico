# 미리펫 API 서버 이미지 — 빌드 컨텍스트는 레포 루트
#   docker build -f apps/miri-pet/server/Dockerfile -t miri-pet-server .
# 런타임은 debian-slim(glibc): sharp 프리빌드 바이너리와 Prisma debian-openssl-3.0.x 엔진을 그대로 쓴다
# 빌드 컨텍스트 제외 목록: Dockerfile.dockerignore (BuildKit이 Dockerfile 옆 파일을 자동 사용)

ARG NODE_IMAGE=node:22-bookworm-slim
ARG PNPM_VERSION=10.29.2
ARG PRISMA_VERSION=6.19.2

# ─── builder: shared + server 빌드, 운영 의존성만 담은 배포 디렉터리 생성 ───
FROM ${NODE_IMAGE} AS builder
ARG PNPM_VERSION
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config
COPY packages/miri-pet-shared ./packages/miri-pet-shared
COPY apps/miri-pet/server ./apps/miri-pet/server

RUN pnpm install --frozen-lockfile --filter @miri-pet/server...

# shared(tsc) → server(prisma generate + nest build) 순서로 빌드
RUN pnpm --filter @miri-pet/server... run build

# 운영 의존성만 설치한 독립 디렉터리(@miri-pet/shared는 dist 포함해 복사됨)
RUN pnpm --filter @miri-pet/server deploy --prod --legacy /prod/server

# ─── runner ───
FROM ${NODE_IMAGE} AS runner
ARG PRISMA_VERSION
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g prisma@${PRISMA_VERSION} \
  && npm cache clean --force

WORKDIR /app/apps/miri-pet/server

COPY --from=builder --chown=node:node /prod/server/node_modules ./node_modules
COPY --from=builder --chown=node:node /prod/server/package.json ./package.json
COPY --from=builder --chown=node:node /app/apps/miri-pet/server/dist ./dist
# Prisma 쿼리 엔진(.so.node)은 src/generated/prisma에만 있다 → 클라이언트가 cwd 기준 대체 경로로 찾는다
COPY --from=builder --chown=node:node /app/apps/miri-pet/server/src/generated ./src/generated
COPY --from=builder --chown=node:node /app/apps/miri-pet/server/prisma ./prisma
COPY --from=builder --chown=node:node /app/apps/miri-pet/server/public ./public

ENV NODE_ENV=production
ENV PORT=4008

USER node
EXPOSE 4008

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4008) + '/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# 마이그레이션 적용 후 서버 시작 (package.json start 스크립트와 동일). exec로 node가 SIGTERM을 직접 받는다
CMD ["sh", "-c", "prisma migrate deploy && exec node dist/main"]
