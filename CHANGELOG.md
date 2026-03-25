# Changelog

Alle nennenswerten Änderungen an Divide werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

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
