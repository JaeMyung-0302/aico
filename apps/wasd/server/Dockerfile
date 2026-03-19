FROM node:22-alpine AS base
RUN npm install -g pnpm@10.29.2

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy only needed packages
COPY packages/wasd-shared ./packages/wasd-shared
COPY packages/typescript-config ./packages/typescript-config
COPY apps/wasd/server ./apps/wasd/server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm --filter @wasd/shared build
RUN pnpm --filter @wasd/server build

# Production stage
FROM node:22-alpine AS runner
RUN npm install -g pnpm@10.29.2
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/wasd-shared ./packages/wasd-shared
COPY apps/wasd/server/package.json ./apps/wasd/server/package.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/wasd-shared/dist ./packages/wasd-shared/dist
COPY --from=builder /app/apps/wasd/server/dist ./apps/wasd/server/dist

WORKDIR /app/apps/wasd/server

ENV NODE_ENV=production
ENV PORT=4002

EXPOSE 4002

CMD ["node", "dist/main.js"]
