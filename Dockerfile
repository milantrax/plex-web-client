# ---- build ----------------------------------------------------------------
# Node 24 (npm 11) matches the npm major that produced package-lock.json;
# npm 10 rejects this lockfile as out of sync.
FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY public ./public
COPY src ./src

# CRA calls the API with relative paths (/api/...), so no API URL is baked in;
# nginx proxies /api to the backend container at runtime.
RUN npm run build

# ---- runtime -------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
