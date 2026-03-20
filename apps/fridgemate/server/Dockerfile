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
COPY apps/fridgemate/server ./apps/fridgemate/server

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client and build
RUN cd apps/fridgemate/server && npx prisma generate
RUN pnpm --filter @fridgemate/server run build

# Production stage
FROM node:22-alpine AS runner
RUN npm install -g pnpm@10.29.2
RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/fridgemate/server/package.json ./apps/fridgemate/server/package.json
COPY apps/fridgemate/server/prisma ./apps/fridgemate/server/prisma

RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client for production
RUN cd apps/fridgemate/server && npx prisma@6.9.0 generate

# Copy built files from builder
COPY --from=builder /app/apps/fridgemate/server/dist ./apps/fridgemate/server/dist

WORKDIR /app/apps/fridgemate/server

ENV NODE_ENV=production
ENV PORT=4001

EXPOSE 4001

CMD ["sh", "-c", "npx prisma@6.9.0 migrate deploy && node dist/main.js"]
