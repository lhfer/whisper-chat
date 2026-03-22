FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile

# Build web (frontend static files)
COPY packages/web/ packages/web/
RUN pnpm --filter @whisper/web build

# Build server
COPY packages/server/ packages/server/

# Production image
FROM node:22-alpine
RUN npm install -g tsx
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/server ./packages/server
COPY --from=base /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=base /app/packages/web/dist ./packages/web/dist
COPY --from=base /app/package.json ./
COPY --from=base /app/pnpm-workspace.yaml ./

EXPOSE 3000
CMD ["tsx", "packages/server/src/app.ts"]
