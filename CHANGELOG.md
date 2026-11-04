# Changelog

Alle nennenswerten Änderungen an Divide werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [Unreleased]

### Added
- `npm --prefix frontend test` für Unit-Tests mit `node --test`, ohne zusätzliche Abhängigkeit (#4)

### Changed
- Ausgaben akzeptieren nur noch Beträge mit höchstens 2 Nachkommastellen (sonst 400 `Ungültige Ausgabe`) (#3)
- `share` in `/balances` ist jetzt der tatsächliche, auf Cent genaue Anteil jeder Person statt des ungerundeten Durchschnitts (#3)
- API-Fehler im Frontend tragen die `error`-Meldung des Servers statt des rohen JSON-Texts (#4)

### Fixed
- Salden und Settlements werden in ganzen Cent berechnet: Nettosummen ergeben exakt 0, kein Settlement überzahlt mehr um einen Cent. Restcent tragen die zuerst hinzugefügten Teilnehmer (#3)
- Die Saldo-Berechnung summiert die Zahlungen in einem Durchlauf statt einmal pro Teilnehmer (#3)
- Der ADD-Button ist bei ungültigem Betrag deaktiviert, und das Formular zeigt einen Hinweis. Fehler der API beim Speichern einer Ausgabe werden angezeigt statt still verschluckt. Beträge mit mehr als 2 Nachkommastellen werden schon im Formular abgefangen (#4, siehe #3)

---

## [0.3.0] - 2026-11-04

### Added
- Admin-Übersicht unter `/#/admin`: alle Gruppen mit Teilnehmer- und Ausgabenzahl, Summe und Ablaufdatum, Löschen vor Ablauf. Eigenes `ADMIN_PASSWORD`, ohne Passwort deaktiviert (503)
- API-Tests (`node:test`) für Room-Isolation, Validierung und Admin-Login

### Changed
- **Achtung bei Updates:** Der Server startet nicht mehr, wenn `JWT_SECRET` (selfhosted oder mit `ADMIN_PASSWORD`) fehlt, kürzer als 32 Zeichen oder ein Platzhalter ist, wenn `PASSWORD` im selfhosted-Modus fehlt oder ein Platzhalter ist, oder wenn `MODE` weder `selfhosted` noch `saas` ist. Die Fehlermeldung beim Start nennt, was zu tun ist (#10, #11)
- Docker-Images werden nur noch aus `main` gebaut; die saas-Instanz nutzt `:latest`, der Branch `saas` ist stillgelegt
- Umami-Analytics wird nur noch im saas-Modus geladen; selfhosted-Instanzen senden keine Tracking-Daten mehr

### Fixed
- Room-Wechsel im saas-Modus setzte keinen `X-Room-Token`, alle Requests liefen in 401
- Ungültiger oder leerer JSON-Body, JSON ohne Objekt und ein Name, der kein Text ist, führen auf den POST-Routen zu HTTP 400 statt 500. Fehlermeldungen für ungültige Namen und Ausgaben sind jetzt deutsch (#8)

### Security
- Room-Token wird im saas-Modus bei jedem Zugriff auf Gruppe, Teilnehmer und Ausgaben geprüft; vorher waren alle Gruppen über fortlaufende IDs ohne Token erreichbar. Globales Listing und Anlegen ohne Token sind gesperrt
- CORS: feste Allowlist per `ALLOWED_ORIGINS` statt `*` mit Credentials; Standard ist kein Cross-Origin-Zugriff
- Rate-Limits für Login, Admin-Login und Raumerstellung, zeitkonstanter Passwortvergleich, Validierung von Zahler, Betrag und Beschreibung, HTML-Escaping des Gruppennamens in der Einladungsmail
- Dependency-Update hono 4.13.7 (sowie transitiv uuid/svix) gegen bekannte Advisories (u. a. ReDoS in der CORS-Middleware, GHSA-8j4g-w8fx-2239)
- Keine Fallbacks mehr auf die öffentlich bekannten Defaults `dev-secret`/`geheim`; ein unbekannter `MODE` schaltet nicht mehr die Zugangskontrolle der API ab (#10, #11)
- `docker-compose.saas.yml` bindet den Port nur noch an `127.0.0.1`, weil Docker veröffentlichte Ports an `ufw` vorbei freigibt und so Caddy und das Rate-Limit umgangen werden konnten (#12)

---

## [0.2.1] - 2026-03-26

### Added
- Umami Analytics eingebunden (`umami.divide-it.app`)
- Custom Events: `gruppe-erstellt`, `gruppe-besucht`, `ausgabe-hinzugefuegt`, `email-gesendet`

---

## [0.2.0] - 2026-03-22

### Added
- E-Mail-Zusendung des Gruppenlinks via Resend (`noreply@divide-it.app`)
- Letzte Gruppen werden im Browser per localStorage gespeichert ("Zuletzt besucht")
- Versionsnummer im Footer
- Link zur Info-Seite und GitHub im Footer
- Warning-Hinweis neu gestaltet (kein gelber Kasten mehr)
- Footer-Text heller

---

## [0.1.0] - 2026-03-21

### Added
- SaaS-Mode (`MODE=saas`) mit Room-basiertem Datenmodell
- Share-Links (`/r/TOKEN`) ohne Login oder Registrierung
- Automatische Löschung von Gruppen nach 30 Tagen
- Deployment auf Hetzner VPS (`divide-it.app`) mit Caddy + SSL
- Umami Analytics-Infrastruktur (`umami.divide-it.app`)
- GitHub Actions baut Docker Images für `main` (`:latest`) und `saas` (`:saas`)
- Install-Skript (`install.sh`) für One-Command-Selfhosting
- Info- & Landingpage auf GitHub Pages

### Changed
- Globale Passwort-Auth entfernt (nur noch im `selfhosted`-Mode)

---

## [0.0.1] - 2026-03-21

### Added
- Initiales Release: Expense-Splitting PWA
- Svelte + Hono + SQLite + Docker Stack
- Aktivitäten, Teilnehmer, Ausgaben, Saldoberechnung
- Schwarzes Terminal-Design (futuristisch/Konsole-Ästhetik)
- PWA (installierbar, Offline-fähig)
- Selfhosted auf Raspberry Pi (`192.168.178.128:3050`)
- Globale Passwort-Auth via JWT
