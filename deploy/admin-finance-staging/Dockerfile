# syntax=docker/dockerfile:1.7

FROM node:22.22.0-bookworm-slim AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS web-build
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY admin-finance.html vite.config.js ./
COPY public ./public
COPY src ./src
COPY scripts ./scripts
COPY server ./server
COPY .github ./.github
ARG VITE_APP_ENTRY=admin-finance
ARG VITE_ADMIN_FINANCE_DATA_SOURCE=api
ARG VITE_ADMIN_FINANCE_RELEASE_SCOPE=mvp
ENV VITE_APP_ENTRY=$VITE_APP_ENTRY
ENV VITE_ADMIN_FINANCE_DATA_SOURCE=$VITE_ADMIN_FINANCE_DATA_SOURCE
ENV VITE_ADMIN_FINANCE_RELEASE_SCOPE=$VITE_ADMIN_FINANCE_RELEASE_SCOPE
RUN test "$VITE_APP_ENTRY" = "admin-finance" \
  && test "$VITE_ADMIN_FINANCE_DATA_SOURCE" = "api" \
  && test "$VITE_ADMIN_FINANCE_RELEASE_SCOPE" = "mvp" \
  && pnpm build:admin-finance-staging \
  && pnpm test:admin-finance-staging-build

FROM nginxinc/nginx-unprivileged:1.27.4-alpine AS web
COPY deploy/admin-finance-staging/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=web-build /app/dist-admin-finance-staging /usr/share/nginx/html
EXPOSE 8080

FROM base AS api-deps
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

FROM node:22.22.0-bookworm-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=api-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server/admin-finance-api.mjs ./server/admin-finance-api.mjs
COPY server/admin-finance ./server/admin-finance
USER node
EXPOSE 8791
CMD ["node", "server/admin-finance-api.mjs"]

FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS node-runtime

FROM postgres:16.10-bookworm@sha256:38471f330eb885e04de130b768d6db4e10469e2311879c7e5c699f6d2d8a1c74 AS database-drill
WORKDIR /app
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY scripts/admin-finance-staging-db-drill.mjs ./scripts/admin-finance-staging-db-drill.mjs
COPY server/admin-finance/staging-database-drill.mjs ./server/admin-finance/staging-database-drill.mjs
COPY deploy/admin-finance-staging/migrations/manifest.v1.json ./deploy/admin-finance-staging/migrations/manifest.v1.json
COPY deploy/admin-finance-staging/database-drill-entrypoint.sh ./deploy/admin-finance-staging/database-drill-entrypoint.sh
COPY docs/admin-finance/data-model/001_admin_finance_schema.sql ./docs/admin-finance/data-model/001_admin_finance_schema.sql
USER postgres
ENTRYPOINT ["/bin/sh", "/app/deploy/admin-finance-staging/database-drill-entrypoint.sh"]
