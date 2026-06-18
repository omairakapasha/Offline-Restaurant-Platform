FROM node:24-alpine AS base
RUN npm install -g pnpm

# Production runtime: disables pino-pretty transport and enables framework prod paths
ENV NODE_ENV=production

WORKDIR /app

# Copy workspace manifests + lockfile first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY lib/db/package.json ./lib/db/
COPY artifacts/api-server/package.json ./artifacts/api-server/

# Install production dependencies only (devDeps: vitest, eslint, typescript, types, etc. are excluded)
RUN pnpm install --prod --frozen-lockfile

# Copy source
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# Writable directory for uploaded menu images
RUN mkdir -p /app/Menu_Item_Images

WORKDIR /app/artifacts/api-server
EXPOSE 5000

CMD ["node", "--import", "tsx/esm", "./src/index.ts"]
