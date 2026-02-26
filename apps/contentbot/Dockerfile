FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 모노레포 루트 설정
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# workspace 의존 패키지
COPY packages/typescript-config/ packages/typescript-config/
COPY packages/eslint-config/ packages/eslint-config/

# contentbot 소스
COPY apps/contentbot/package.json apps/contentbot/
RUN pnpm install --filter @repo/contentbot...

COPY apps/contentbot/ apps/contentbot/
RUN pnpm --filter @repo/contentbot build

# prod 의존성만 별도 설치 (네이티브 모듈 포함)
RUN pnpm install --filter @repo/contentbot... --prod --force

# --- Production ---
FROM node:22-slim AS production

RUN groupadd -r contentbot && useradd -r -g contentbot contentbot

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/contentbot/node_modules ./apps/contentbot/node_modules
COPY --from=base /app/apps/contentbot/dist ./apps/contentbot/dist
COPY --from=base /app/apps/contentbot/prompts ./apps/contentbot/prompts
COPY --from=base /app/apps/contentbot/package.json ./apps/contentbot/package.json

ENV DB_DIR=/data
RUN mkdir -p /data && chown contentbot:contentbot /data

USER contentbot
CMD ["node", "apps/contentbot/dist/index.js"]
