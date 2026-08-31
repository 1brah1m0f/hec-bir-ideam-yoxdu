# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build stage
# Needs the dev dependencies (vite, tailwind, typescript) to produce dist/.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------------------------------------------------------------- run stage
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app

# express and compression are the only runtime dependencies; everything the
# frontend needs was bundled into dist/ in the stage above
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server ./server
# server/catalog.js reads the same catalog.json the page was built from
COPY src/shared/data/catalog.json ./src/shared/data/catalog.json
COPY scripts/backup.mjs ./scripts/backup.mjs

# orders.db lives on a mounted volume, never in the image layer
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /data
VOLUME ["/data"]

USER node
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
