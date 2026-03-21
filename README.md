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
- PWA — installierbar auf dem Handy
- Dark terminal aesthetic

## Tech Stack

| | |
|---|---|
| Frontend | Svelte 5 + Vite + Tailwind CSS |
| Backend | Hono + Node.js |
| Datenbank | SQLite (better-sqlite3) |
| Auth | JWT via httpOnly Cookie |
| Deployment | Docker + docker-compose |

## Deployment (Pi)

**1. Repo klonen**
```bash
git clone https://github.com/DEIN-USER/divide.git
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
```

**3. Port in `docker-compose.yml` wählen** (linke Seite = Pi-Port)
```yaml
ports:
  - "8042:3000"
```

**4. Starten**
```bash
docker compose up -d --build
```

Die App läuft auf `http://pi-adresse:8042`.

## Update

```bash
git pull && docker compose up -d --build
```

## Lokale Entwicklung

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (neues Terminal)
cd frontend && npm install && npm run dev
```

Frontend läuft auf `http://localhost:5173`, proxied API-Calls automatisch zum Backend auf Port 3000.

## Daten

Die SQLite-Datenbank liegt in einem Docker Volume (`divide-data`) und überlebt Container-Updates.
