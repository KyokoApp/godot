# ---- build tampilan (Phaser) ----
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev=false || npm install
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

# ---- runtime: server arena + file statis ----
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server ./server
COPY --from=web /app/dist ./dist

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=4s --start-period=8s \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
