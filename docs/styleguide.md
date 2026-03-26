# DIVIDE — Styleguide

> Retro-Terminal Aesthetic. Monospace. Neon auf Schwarz.

---

## Design-Philosophie

Divide sieht aus wie ein Terminal — kein Zufall. Das Design kommuniziert:
**Präzision, Kontrolle, Klarheit.** Keine Ablenkung, kein Rauschen.
Nur das was zählt: Zahlen und wer wem was schuldet.

Kernprinzipien:
- **Monospace only** — keine Serifenlosen, keine Mischung
- **Neon auf Schwarz** — hoher Kontrast, minimale Farben
- **Kein Dekor** — keine Schatten unter Cards, keine Gradienten, keine Icons außer funktionale
- **Terminal-Sprache** — `>`, `$`, `//`, `[!]` als visuelle Marker

---

## Farben

```css
/* Primäre Akzente */
--green:      #00ff88   /* Hauptakzent — CTAs, Logos, aktive Zustände */
--green-dim:  #00cc6a   /* Gedämpftes Grün — Hover, Focus-Borders */
--green-glow: rgba(0, 255, 136, 0.15)  /* Grüner Schimmer — Hover-Backgrounds */
--cyan:       #00e5ff   /* Sekundärakzent — Highlights, Nummern */
--cyan-dim:   #00b8cc   /* Gedämpftes Cyan — Warn-Prefixe, Chips */
--red:        #ff4444   /* Fehler, Löschaktionen, negative Salden */

/* Hintergründe */
--bg:         #000000   /* Basis — reines Schwarz */
--bg-card:    #080808   /* Cards und Panels */
--bg-input:   #0a0a0a   /* Eingabefelder */

/* Borders */
--border:        #1a1a1a   /* Standard-Border */
--border-bright: #00ff8840 /* Glühende Border (selten) */

/* Text */
--text:        #aaa    /* Standard-Fließtext */
--text-bright: #f0f0f0 /* Hervorgehobener Text */
```

### Graustufen (inline)
```
#111 → #222 → #333 → #444 → #555 → #666 → #888 → #e8e8e8
dunkel ←————————————————————————————————————→ hell
```

### Semantische Farben
| Zustand | Farbe |
|---|---|
| Positiv (bekomme Geld) | `--green` |
| Negativ (schulde Geld) | `--red` |
| Aktiver Tab | `--green` |
| Inaktiv / Deaktiviert | `#333` |
| Label / Hint | `#444`–`#666` |
| Fehler | `--red` |

---

## Typografie

```css
--mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
```

**Ausschließlich Monospace.** Keine Ausnahmen.

### Schriftgrößen

| Verwendung | Größe |
|---|---|
| Haupt-Logo (Landing) | `clamp(2.5rem, 10vw, 4rem)` |
| Seiten-Logo (Login) | `28px` |
| Titel (ActivityList) | `22px` |
| Basis-Schriftgröße | `14px` |
| Eingabefelder | `16px` (min. — verhindert iOS-Zoom) |
| Fließtext, Labels | `13px` |
| Buttons, sekundär | `12px` |
| Kleine Labels | `11px` |
| Hints, Datum, Footer | `10px` |

### Letter-Spacing

| Kontext | Wert |
|---|---|
| Haupt-Logo | `0.2em` |
| Login-Logo | `6px` |
| Titel | `4px` |
| Labels / Taglines | `2px` |
| Standard-UI-Text | `1px` |

### Schriftgewicht
- `700` für Logos und Hervorhebungen
- `400` (normal) für alles andere

---

## Abstände & Layout

```
Container-Maxbreite: 640px (mobile-first PWA)
Seiten-Padding:      48px oben, 32px unten
Standard-Gap:        12px
Card-Padding:        14–16px
```

### Spacing-Skala
```
4px → 6px → 8px → 10px → 12px → 14px → 16px → 24px → 32px → 48px
```

---

## Komponenten

### Cards
```css
background:    var(--bg-card)    /* #080808 */
border:        1px solid var(--border)
border-radius: 4px
padding:       14–16px
```

### Eingabefelder
```css
background:  var(--bg-input)
border:      1px solid var(--border)
font-size:   16px  /* wichtig: iOS-Zoom verhindern */
caret-color: var(--green)
/* Focus: */
border-color: var(--green-dim)
box-shadow:   0 0 0 1px var(--green)
```

### Buttons (primary)
```css
background:     var(--green)
color:          #000
font-family:    var(--mono)
font-weight:    700
letter-spacing: 2px
border:         none
padding:        8px 14px
/* Hover: */
opacity: 0.8
/* Disabled: */
opacity: 0.3
```

### Buttons (ghost)
```css
background:  transparent
border:      1px solid var(--border)
color:       var(--text)
/* Hover: */
border-color: var(--green)
background:   var(--green-glow)
color:        var(--green)
```

### Tabs
```css
/* Inaktiv */
color:        #444
border-color: #1a1a1a
/* Aktiv */
color:        var(--green)
border-color: var(--green-dim)
background:   var(--green-glow)
```

### Chips / Tags
```css
background:    #111
border:        1px solid #222
border-radius: 3px
padding:       3px 8px
color:         var(--cyan-dim)
font-size:     11px
```

### Listenpunkte
```css
border-bottom: 1px solid var(--border)  /* außer letztes Element */
padding:       7–10px
/* Hover: */
background: var(--green-glow)
```

---

## Animationen & Übergänge

| Element | Transition |
|---|---|
| Buttons / Hover | `0.15s` |
| Borders / Focus | `0.2s` |
| Cursor-Blinken | `1s step-end infinite` (blink-Keyframe) |

```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
```

---

## Terminal-Sprache

Divide nutzt Terminal-Konventionen als visuelle Marker:

| Symbol | Bedeutung |
|---|---|
| `>` | Sektion / Navigation |
| `$` | Eingabe-Prompt |
| `//` | Kommentar / Erklärung |
| `[!]` | Warnung |
| `@` | Email-Eingabe |
| `_` | Blinkender Cursor |

---

## Glows & Schatten

Sparsam einsetzen — nur für Logos und wichtige Akzente:

```css
/* Haupt-Logo */
text-shadow: 0 0 30px rgba(0, 255, 136, 0.4);

/* Login-Logo */
text-shadow: 0 0 24px var(--green);

/* Focus-Ring (kein box-shadow, sondern border + outline) */
box-shadow: 0 0 0 1px var(--green);
```

**Keine** Schatten unter Cards oder Panels — die Dunkelheit macht die Trennung.

---

## Scrollbar

```css
::-webkit-scrollbar       { width: 4px }
::-webkit-scrollbar-track { background: var(--bg) }
::-webkit-scrollbar-thumb { background: #222; border-radius: 2px }
```

---

## Mobile / PWA

- Viewport: `width=device-width, initial-scale=1.0, viewport-fit=cover`
- Höhe: `min-height: 100dvh` (dynamisch, berücksichtigt Tastatur)
- Safe-Area-Insets: `env(safe-area-inset-*)` für Notch und Home-Indikator
- Theme-Color: `#000000`
- Status-Bar (iOS): `black-translucent`
- Alle Inputs: min. `16px` Schriftgröße (verhindert Auto-Zoom auf iOS)

---

## Do's & Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Monospace für alles | Sans-Serif oder Serif verwenden |
| Grün für primäre Aktionen | Mehrere Farben mischen |
| `//` für Kommentare in der UI | Normalen Fließtext für Labels |
| Borders statt Shadows für Tiefe | Box-Shadow unter Cards |
| Terminal-Vokabular (`starten`, `löschen`) | Marketing-Sprache (`Jetzt starten!`) |
| Kleine, präzise Schrift | Große Headlines |
| Dezente Hover-States | Starke Animationen |
