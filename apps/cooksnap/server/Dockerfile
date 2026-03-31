FROM node:22-alpine AS base
RUN npm install -g pnpm@10.29.2

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy only needed packages
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config
COPY apps/cooksnap/server ./apps/cooksnap/server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client and build
RUN pnpm --filter @cooksnap/server prisma:generate
RUN pnpm --filter @cooksnap/server run build

# Production stage
FROM node:22-alpine AS runner
RUN npm install -g pnpm@10.29.2
RUN apk add --no-cache openssl python3 py3-pip \
    && pip3 install --break-system-packages yt-dlp
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/cooksnap/server/package.json ./apps/cooksnap/server/package.json
COPY apps/cooksnap/server/prisma ./apps/cooksnap/server/prisma

RUN pnpm install --frozen-lockfile --prod

# Install prisma CLI for migrations
RUN cd apps/cooksnap/server && npx prisma@6.19.2 generate

# Copy Prisma generated client from builder
COPY --from=builder /app/apps/cooksnap/server/src/generated ./apps/cooksnap/server/src/generated
COPY --from=builder /app/apps/cooksnap/server/dist ./apps/cooksnap/server/dist

WORKDIR /app/apps/cooksnap/server

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["sh", "-c", "npx prisma@6.19.2 migrate deploy && node dist/main"]
