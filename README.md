# DIVIDE

> Gemeinsame Ausgaben aufteilen — simpel und fair.

Eine kleine PWA für unterwegs: Aktivitäten anlegen (z.B. "Ausflug Berlin"), Teilnehmer eintragen, Ausgaben erfassen — und jederzeit sehen, wer wem wieviel schuldet.

```
divide@pi:~$ authenticate
// passwort ········
```

## Features

- Mehrere Aktivitäten (Ausflug, Urlaub, WG-Kasse, ...)
- Ausgaben pro Person erfassen
- Automatische Schulden-Berechnung mit minimalem Settlement
- Geteiltes Passwort-Login (JWT, 30 Tage Session)
- PWA — installierbar auf dem Handy, optimiert für iPhone
- Dark terminal aesthetic

## Tech Stack

| | |
|---|---|
| Frontend | Svelte 5 + Vite + Tailwind CSS |
| Backend | Hono + Node.js |
| Datenbank | SQLite (better-sqlite3) |
| Auth | JWT via httpOnly Cookie |
| Deployment | Docker + docker-compose |

---

## Installation (Ein Befehl)

```bash
curl -fsSL https://raw.githubusercontent.com/haenrick/divide/main/install.sh | bash
```

Das Skript:
- prüft ob Docker installiert ist (und installiert es falls nicht)
- fragt nach Passwort und Port
- generiert automatisch einen sicheren JWT-Secret
- startet den Container

### Update

```bash
cd divide && docker compose pull && docker compose up -d
```

---

## Manuelle Installation

**1. Repo klonen**
```bash
git clone https://github.com/haenrick/divide.git
cd divide
```

**2. `.env` anlegen**
```bash
cp .env.example .env
nano .env
```

```env
PASSWORD=dein-passwort
JWT_SECRET=langer-zufaelliger-string
PORT=3050
```

**3. Starten**
```bash
docker compose up -d
```

Die App läuft auf `http://pi-adresse:3050`.

### Update (manuell)

```bash
cd divide && docker compose pull && docker compose up -d
```

---

## Lokale Entwicklung

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (neues Terminal)
cd frontend && npm install && npm run dev
```

Frontend läuft auf `http://localhost:5173`, proxied API-Calls automatisch zum Backend auf Port 3000.

Zum Testen mit lokalem Docker-Build:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## Daten

Die SQLite-Datenbank liegt in einem Docker Volume (`divide-data`) und überlebt Container-Updates und Neustarts.
