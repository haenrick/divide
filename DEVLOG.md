# DEVLOG — Divide

> Entstehungsgeschichte der App, gebaut am 21. März 2026.

---

## Idee

Das Problem: unterwegs mit Freunden Ausgaben teilen und am Ende wissen, wer wem wieviel schuldet. Keine komplizierte App, keine Accounts, kein Overhead — einfach eine kleine PWA die das genau eine Ding gut macht.

---

## Tech Stack Entscheidung

| | Wahl | Begründung |
|---|---|---|
| Frontend | Svelte 5 + Vite | Minimal, kompiliert zu reinem JS, kein Runtime-Overhead |
| Styling | Tailwind CSS | Dark terminal theme, schnell |
| Backend | Hono + Node.js | Ultraleichtes HTTP-Framework (~5kb) |
| Datenbank | SQLite (better-sqlite3) | Keine Infrastruktur, eine Datei |
| Auth | JWT via httpOnly Cookie | Geteilt Passwort, 30 Tage Session |
| Deployment | Docker + docker-compose | Reproduzierbar, Pi-freundlich |

---

## Entwicklung

### Backend
- Hono-Server mit REST API für Activities, Participants, Expenses
- SQLite mit WAL-Modus und Foreign Keys
- Schulden-Berechnung per Settlement-Algorithmus (minimale Anzahl Transaktionen)
- dotenv für Konfiguration via `.env`

### Auth
- Geteiltes Passwort in `.env`
- JWT wird bei Login ausgestellt, in httpOnly Cookie gespeichert
- Alle `/api/*` Routes außer `/login` durch Middleware geschützt
- Session läuft nach 30 Tagen ab

### Frontend
- `ActivityList` — Übersicht aller Aktivitäten, anlegen/löschen
- `ActivityDetail` — Teilnehmer, Ausgaben, Schulden-Ansicht
- `Login` — Passwort-Screen im Terminal-Look
- Globaler Auth-State in `App.svelte`, 401-Fehler leiten zurück zum Login
- PWA-Manifest + Service Worker via `vite-plugin-pwa`

### Design
- Schwarz/Grün Terminal-Ästhetik mit Monospace-Font
- Grüner Glow-Effekt auf Akzenten
- iPhone-Optimierungen: `viewport-fit=cover`, Safe Area Insets, kein Auto-Zoom auf Inputs

### Deployment
- Docker Multi-Stage Build (Frontend → Backend + dist)
- `$BUILDPLATFORM` für Frontend-Stage → verhindert QEMU-Timeout bei Cross-Platform-Builds
- Unterstützt: `linux/amd64`, `linux/arm64`, `linux/arm/v7`
- SQLite in Docker Volume → Daten überleben Updates

### Publishing
- GitHub Actions baut bei jedem Push automatisch ein Multi-Platform-Image
- Image wird auf `ghcr.io/haenrick/divide:latest` gepusht
- Ein-Befehl-Installer (`install.sh`) prüft Docker, fragt Passwort + Port, generiert JWT-Secret automatisch

---

## Zeitlinie

```
Idee → Tech Stack → Backend API → Frontend → Auth → Docker →
GitHub Actions → Multi-Platform Fix → Cloudflare Tunnel → fertig
```

---

## Lessons Learned

- `hono/jwt` `verify()` benötigt expliziten Algorithmus-Parameter (`'HS256'`) — nicht optional wie die Doku suggeriert
- Vite-Builds unter QEMU-Emulation (arm/v7) laufen in Timeout → `--platform=$BUILDPLATFORM` auf der Build-Stage löst das
- `vite-plugin-pwa@1.2.0` hat Peer-Dep-Konflikt mit Vite 8 → `--legacy-peer-deps`
- dotenv muss mit absolutem Pfad geladen werden wenn der Prozess aus einem anderen Verzeichnis gestartet wird

---

## Ergebnis

Eine vollständig deployete, öffentlich installierbare PWA — von der Idee bis zur Ein-Befehl-Installation an einem Tag.

```bash
curl -fsSL https://raw.githubusercontent.com/haenrick/divide/main/install.sh | bash
```
