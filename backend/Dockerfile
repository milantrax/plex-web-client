# ---- deps ----------------------------------------------------------------
# Debian-slim (glibc) so bcrypt can use its prebuilt binaries; build toolchain
# is kept in this stage only, in case a native module has to be compiled.
FROM node:20-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime -------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3001 \
    MEDIA_CACHE_DIR=/app/cache

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Mount point for the (future) album art / artist image cache volume.
RUN mkdir -p "$MEDIA_CACHE_DIR" && chown -R node:node /app

USER node

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "index.js"]
