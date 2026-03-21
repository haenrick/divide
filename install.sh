#!/bin/bash
set -e

REPO="ghcr.io/haenrick/divide"
INSTALL_DIR="divide"

echo ""
echo "  ██████╗ ██╗██╗   ██╗██╗██████╗ ███████╗"
echo "  ██╔══██╗██║██║   ██║██║██╔══██╗██╔════╝"
echo "  ██║  ██║██║██║   ██║██║██║  ██║█████╗  "
echo "  ██║  ██║██║╚██╗ ██╔╝██║██║  ██║██╔══╝  "
echo "  ██████╔╝██║ ╚████╔╝ ██║██████╔╝███████╗"
echo "  ╚═════╝ ╚═╝  ╚═══╝  ╚═╝╚═════╝ ╚══════╝"
echo ""
echo "  // Ausgaben aufteilen — simpel und fair"
echo ""

# ── Docker prüfen ────────────────────────────────────────────────────────────

if ! command -v docker &>/dev/null; then
  echo "[!] Docker nicht gefunden. Wird installiert..."
  curl -fsSL https://get.docker.com | sh
  echo "[✓] Docker installiert"
fi

# ── Konfiguration abfragen ───────────────────────────────────────────────────

echo "── Konfiguration ──────────────────────────────"
echo ""

read -rp "  Passwort für die App: " PASSWORD
echo ""

read -rp "  Port [3050]: " PORT
PORT="${PORT:-3050}"
echo ""

# JWT Secret automatisch generieren
JWT_SECRET=$(openssl rand -hex 32)

# ── Verzeichnis anlegen ──────────────────────────────────────────────────────

mkdir -p "$INSTALL_DIR" && cd "$INSTALL_DIR"

# ── .env schreiben ───────────────────────────────────────────────────────────

cat > .env << EOF
PASSWORD=${PASSWORD}
JWT_SECRET=${JWT_SECRET}
PORT=${PORT}
EOF

# ── docker-compose.yml schreiben ─────────────────────────────────────────────

cat > docker-compose.yml << EOF
services:
  divide:
    image: ${REPO}:latest
    restart: unless-stopped
    ports:
      - "${PORT}:${PORT}"
    volumes:
      - divide-data:/data
    env_file:
      - .env

volumes:
  divide-data:
EOF

# ── Image pullen & starten ───────────────────────────────────────────────────

echo "── Image wird geladen ─────────────────────────"
echo ""
docker compose pull
docker compose up -d

# ── Fertig ───────────────────────────────────────────────────────────────────

LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo "── Fertig ─────────────────────────────────────"
echo ""
echo "  App läuft unter:"
echo "  http://${LOCAL_IP}:${PORT}"
echo ""
echo "  Update:"
echo "  cd ${INSTALL_DIR} && docker compose pull && docker compose up -d"
echo ""
