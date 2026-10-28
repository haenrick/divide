# DIVIDE

PWA zum Aufteilen gemeinsamer Ausgaben: Aktivitäten, Teilnehmer, Ausgaben, minimales Settlement.

## Stack
- **Backend:** Hono + Node.js (TypeScript, läuft direkt mit `tsx`, kein Build), SQLite über `better-sqlite3`
  - `backend/src/index.ts` – alle Routen, Auth, Validierung, Settlement
  - `backend/src/db.ts` – Schema und DB-Verbindung (`DB_PATH`, Standard `data/divide.db`)
- **Frontend:** Svelte 5 + Vite + Tailwind CSS 4, PWA (`vite-plugin-pwa`)
  - `frontend/src/lib/` – Komponenten, `api.ts` (API-Client), `rooms.ts`
- **Deployment:** ein Docker-Image (Backend liefert das gebaute Frontend aus), siehe `Dockerfile`

## Zwei Modi (`MODE` in `.env`)
- `selfhosted` (Standard): Login mit globalem `PASSWORD`, JWT im httpOnly-Cookie
- `saas` (divide-it.app): kein Login, Gruppen („Rooms“) per Share-Link `/r/<token>`, Header `X-Room-Token`, Löschung nach 30 Tagen

Änderungen am Backend müssen in **beiden** Modi funktionieren. Weitere Variablen: `.env.example`.

## Befehle
```bash
npm --prefix backend ci && npm --prefix frontend ci   # Abhängigkeiten
npm --prefix backend test       # API-Tests (node:test, In-Process über app.request, temporäre DB)
npm --prefix frontend run check # svelte-check + tsc
npm --prefix frontend run build # Frontend bauen
npm --prefix backend run dev    # Backend auf :3000 (Watch)
npm --prefix frontend run dev   # Vite-Dev-Server, proxyt /api → :3000
```

## Konventionen
- Neue Backend-Logik bekommt einen Test in `backend/test/api.test.ts` (Muster: `makeRoom`, `addPerson`, `call`).
  Die Tests laufen im `saas`-Modus; selfhosted-spezifisches Verhalten gesondert prüfen.
- Ungültige Eingaben → 4xx mit `{ "error": "<deutsche Meldung>" }`, nie 500.
- Beträge sind Geldbeträge: Rundung auf Cent beachten, Summen müssen aufgehen.
- UI folgt `docs/styleguide.md` (Terminal-Ästhetik, nur Monospace, Neon auf Schwarz, kein Dekor).
- UI-Texte auf Deutsch; Code, Bezeichner und Commit-Messages auf Englisch,
  Commit-Präfixe wie im Log: `feat:`, `fix:`, `docs:`, `chore:`, `ci:`.
- Nennenswerte Änderungen in `CHANGELOG.md` unter einem neuen Abschnitt eintragen (Keep a Changelog).
- Version steht in `frontend/package.json` – nur auf Anweisung erhöhen.

## Nicht anfassen ohne Rückfrage
- `.github/workflows/` – Push auf `main` baut und veröffentlicht `ghcr.io/haenrick/divide:latest`.
- `install.sh`, `docker-compose*.yml` – werden von bestehenden Installationen genutzt.
- `data/` – lokale Datenbank.
- `DEVLOG.md`, `docs/session-*.md` – Henriks Notizen.
