# ── Stage 1: Frontend bauen ──────────────────────────────────────────────────
# $BUILDPLATFORM = Architektur des GitHub-Runners (amd64)
# → Frontend wird nie per QEMU emuliert, egal für welche Zielplattform gebaut wird
FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend + fertiges Frontend ─────────────────────────────────────
FROM node:22-alpine

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ../frontend/dist

VOLUME ["/data"]
ENV DB_PATH=/data/divide.db
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
