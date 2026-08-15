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
