# ---- Backend API (Express) ----
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies only (cached unless package files change)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App source (.env and node_modules are excluded via .dockerignore)
COPY . .

# Run as the non-root "node" user that ships with the image
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/ >/dev/null || exit 1

CMD ["node", "server.js"]
