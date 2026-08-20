# Builds the Colyseus server and the Vite client, then serves both from one process.
# Useful for platforms that give you a single container and one port.

# ---- build ------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# server dependencies first, so a client-only change does not invalidate this layer
COPY package.json package-lock.json ./
RUN npm ci

COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

COPY . .

# VITE_ variables are inlined at build time, so the server URL has to be known here
ARG VITE_SERVER_URL
ARG VITE_CHAT_APP_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_CHAT_APP_URL=$VITE_CHAT_APP_URL

RUN npm run build
RUN cd client && npx vite build

# ---- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/server/lib ./server/lib
COPY --from=build /app/client/dist ./client/dist

ENV PORT=2567
ENV SERVE_CLIENT=true
EXPOSE 2567

# the platform health check can use this
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://localhost:$PORT/health || exit 1

CMD ["node", "server/lib/server/index.js"]
