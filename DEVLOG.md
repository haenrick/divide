# DEVLOG — Divide

> Entstehungsgeschichte der App, gebaut am 21. März 2026.

---

---

# 22. März 2026 — Von selfhosted zu SaaS

> Aus einem Raspberry-Pi-Tool wird ein vollwertiges SaaS-Produkt. Ein intensiver Tag: neuer Branch, neues Deployment-Modell, neuer Server — und jede Menge SQLite-Eigenheiten.

---

## Rückblick: Wo wir gestern aufgehört haben

Nach Tag 1 war Divide eine funktionsfähige PWA: Auth via globalem Passwort, Docker-Image auf ghcr.io, Ein-Befehl-Installer für den Raspberry Pi. Fertig für den Eigenbedarf — aber noch nicht für andere.

Tag 2 hatte ein klares Ziel: **Divide für alle öffnen**, ohne dass jeder seinen eigenen Server aufsetzen muss.

---

## Was heute gebaut wurde

### 1. Dual-Mode-Architektur: selfhosted vs. saas

Die wichtigste Entscheidung des Tages war, **eine Codebasis für zwei Modi** zu behalten, statt zwei separate Projekte. Gesteuert wird das über eine einzige Umgebungsvariable in `.env`:

```env
MODE=selfhosted   # Standard, für Raspberry Pi
MODE=saas         # Für den öffentlichen Server
```

Ein neuer `/api/config`-Endpoint gibt den aktiven Mode ans Frontend, das sich entsprechend verhält — ohne Build-Flags, ohne separate Bundles.

Das hält die Architektur sauber: `main` bleibt stable selfhosted, der neue `saas`-Branch ist der Entwicklungszweig für das öffentliche Angebot.

---

### 2. SaaS-Modus: Rooms statt Login

Im selfhosted-Mode gibt es ein globales Passwort. Im SaaS-Mode braucht niemand einen Account. Stattdessen:

- Auf der Landing Page tippt man einen Gruppennamen ein
- Ein **Room** wird angelegt mit einem zufälligen 10-stelligen Hex-Token
- Der Share-Link lautet: `divide.app/#/r/TOKEN`
- Wer den Link hat, kommt rein — fertig

Das ist bewusst minimalistisch. Kein Login, kein E-Mail-Feld, kein Passwort. Teilen = Zugang gewähren.

**Datenbankseite:** Die `activities`-Tabelle hat zwei neue Columns bekommen:

```sql
ALTER TABLE activities ADD COLUMN room_token TEXT;
ALTER TABLE activities ADD COLUMN expires_at INTEGER;
```

SQLite macht bei `ALTER TABLE` keinen `UNIQUE`-Constraint möglich — das muss über einen separaten Index laufen. Die Migration läuft automatisch beim ersten Start und ist idempotent (prüft ob die Column bereits existiert).

**Automatisches Aufräumen:** Ein täglicher Cronjob im Backend löscht Rooms, die älter als 30 Tage sind:

```typescript
// Läuft täglich um Mitternacht
setInterval(() => {
  db.prepare(`DELETE FROM activities WHERE expires_at < ?`)
    .run(Date.now());
}, 24 * 60 * 60 * 1000);
```

---

### 3. Hash-Routing für direkte Links

Ein Problem mit Single-Page-Apps und direkten Links: Der Server kennt `/r/TOKEN` nicht — das ist Frontend-Routing. Die Lösung: **Hash-basiertes Routing**.

Statt `divide.app/r/TOKEN` → `divide.app/#/r/TOKEN`

Der Server liefert immer `index.html`, der Hash wird nie ans Backend geschickt, das Frontend liest ihn selbst aus. Kein Server-Side-Routing nötig, keine 404-Fallbacks zu konfigurieren.

---

### 4. Share-Button mit Clipboard-Fallback

Im SaaS-Mode hat `ActivityDetail` einen Share-Button, der den Room-Link in die Zwischenablage kopiert.

`navigator.clipboard` läuft nur über HTTPS — auf HTTP (z.B. beim lokalen Testen oder über eine reine IP) schlägt es fehl. Deswegen gibt es einen Fallback:

```typescript
async function copyLink() {
  const url = `${window.location.origin}/#/r/${roomToken}`;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    // Fallback für HTTP
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    copied = true;
  }
}
```

---

### 5. Landing Page im Terminal-Stil

Die Landing Page im SaaS-Mode ist kein Marketing-Blabla. Sie ist ein Terminal-Prompt:

```
> DIVIDE v0.1.0
  split expenses. no signup. no bullshit.

  Gruppenname: [______________]

  [GRUPPE ERSTELLEN]
```

Gruppenname eingeben, Button drücken, Room wird erstellt, Redirect auf `/#/r/TOKEN`. Von da an teilt man den Link mit wem man möchte.

---

### 6. Hetzner VPS: Deployment für SaaS

Der Raspberry Pi ist perfekt für selfhosted — aber für einen öffentlichen Service braucht man etwas mit garantierter Uptime und einer richtigen IP.

**Server:** Hetzner CAX11 — eigentlich sollte es ein ARM-Server werden, aber am Ende wurde es der **CX22** (amd64), weil der für den Einstieg besser passt.

- **OS:** Ubuntu 24.04 LTS
- **IP:** `94.130.226.2`
- **Kosten:** 3,29 €/Monat
- **Docker:** installiert via `get.docker.com`

```bash
curl -fsSL https://get.docker.com | sh
```

Der `saas`-Branch wurde direkt auf dem Server geklont, `.env` angelegt, Image lokal gebaut:

```bash
git clone -b saas https://github.com/haenrick/divide.git
cd divide
docker compose up -d --build
```

**SSH-Config auf dem Mac** für bequemen Zugang:

```
Host hetzner
  HostName 94.130.226.2
  User root
  IdentityFile ~/.ssh/id_ed25519
```

Damit reicht `ssh hetzner`.

---

### 7. Architektur-Entscheidungen im Überblick

| Thema | Entscheidung | Begründung |
|---|---|---|
| Zwei Modi | Eine Codebasis, eine `MODE`-Variable | Kein Drift zwischen Branches |
| Auth (saas) | Kein Login, nur Room-Token | Minimale Einstiegshürde |
| Routing | Hash-Routing (`#/r/TOKEN`) | Kein Server-Side-Routing nötig |
| Datenbank | SQLite für beide Modi | Keine Infrastruktur, eine Datei |
| Hosting | Pi (selfhosted) + Hetzner (saas) | Richtige Tool für den richtigen Job |
| Pi-HTTPS | Cloudflare Tunnel | Kein Port-Forwarding am Router |
| Hetzner-HTTPS | Caddy geplant | Noch nicht eingerichtet |
| User Accounts | Noch nicht | Phase 3, wenn Bedarf entsteht |

---

## Offene Punkte

- [ ] **Domain kaufen** — `divide.app` oder ähnliches
- [ ] **Caddy auf Hetzner** einrichten für automatisches SSL
- [ ] **GitHub Actions für `saas`-Branch** — automatische Builds auf ghcr.io
- [ ] **User Accounts** (optional) — Hybrid-Ansatz wenn die Nutzerzahl wächst

---

## Lessons Learned

- **SQLite `ALTER TABLE` hat kein `UNIQUE`** — das muss als separater `CREATE UNIQUE INDEX` laufen. Wer das vergisst, debuggt lange.
- **`navigator.clipboard` nur über HTTPS** — immer einen Fallback einbauen, solange die Domain noch nicht steht.
- **Hash-Routing ist unterschätzt** — für SPAs ohne Backend-Routing die eleganteste Lösung, ohne Konfigurationsaufwand.
- **Hetzner CX22 statt CAX11** — ARM klingt verlockend (günstiger, effizienter), aber für einen SaaS-Start ist amd64 mit breiterem Docker-Image-Support der pragmatischere Einstieg.
- **Einen Branch, nicht zwei Repos** — die Versuchung ist groß, saas als eigenes Repo aufzusetzen. Aber eine Codebasis mit Feature-Flags hält alles wartbar.

---

## Stand am Abend

```
main  → stable selfhosted, läuft auf dem Pi, öffentlich installierbar
saas  → SaaS-Modus, läuft auf Hetzner (94.130.226.2:3050), Domain fehlt noch
```

Divide ist jetzt **zweispurig**: Wer selbst hosten will, nimmt `main` und den Ein-Befehl-Installer. Wer einfach nur eine Gruppe aufmachen will, bekommt bald einen Link — sobald die Domain steht.

Von der Idee bis zur laufenden SaaS-Infrastruktur: zwei Tage.

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
