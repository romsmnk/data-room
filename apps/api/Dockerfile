FROM node:22-slim AS build
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* && corepack enable
WORKDIR /repo

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @data-room/shared --filter @data-room/api

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @data-room/shared build
RUN pnpm --filter @data-room/api exec prisma generate
RUN pnpm --filter @data-room/api build

# --- runtime image: reuse the build stage's node_modules as-is (pnpm's ---
# --- symlinked layout doesn't survive a separate --prod reinstall cleanly) ---
FROM node:22-slim AS runtime
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* && corepack enable
ENV NODE_ENV=production
WORKDIR /repo

COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/pnpm-workspace.yaml /repo/package.json ./
COPY --from=build /repo/packages/shared packages/shared
COPY --from=build /repo/apps/api apps/api

WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
