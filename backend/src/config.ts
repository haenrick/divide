// Prüft die Konfiguration beim Start. Bekannte Defaults und Platzhalter werden
// abgelehnt, damit der Dienst nie mit öffentlich bekannten Secrets oder ohne
// Zugangskontrolle (unbekannter MODE) läuft.

export type Config =
  | { mode: 'selfhosted'; password: string; jwtSecret: string }
  | { mode: 'saas'; jwtSecret: string | undefined }

type Env = Record<string, string | undefined>

const MODES = ['selfhosted', 'saas'] as const
const MIN_SECRET_LENGTH = 32
const SECRET_PLACEHOLDERS = ['dev-secret', 'langer-zufaelliger-string-hier-einsetzen', 'langer-zufaelliger-string']
const PASSWORD_PLACEHOLDERS = ['geheim', 'dein-passwort']

export function validateConfig(env: Env): { errors: string[]; config: Config | null } {
  const errors: string[] = []

  const rawMode = env.MODE === undefined ? 'selfhosted' : env.MODE.trim()
  const mode = MODES.find(m => m === rawMode)
  if (!mode) {
    errors.push(`MODE ${JSON.stringify(env.MODE)} ist ungültig – erlaubt: ${MODES.join(', ')}`)
  }

  const jwtSecret = env.JWT_SECRET
  if (mode === 'selfhosted' || env.ADMIN_PASSWORD) {
    if (!jwtSecret) {
      errors.push('JWT_SECRET ist nicht gesetzt – z. B. mit `openssl rand -hex 32` erzeugen und in .env eintragen')
    } else if (SECRET_PLACEHOLDERS.includes(jwtSecret)) {
      errors.push('JWT_SECRET ist ein bekannter Platzhalter – z. B. mit `openssl rand -hex 32` neu erzeugen')
    } else if (jwtSecret.length < MIN_SECRET_LENGTH) {
      errors.push(`JWT_SECRET ist zu kurz (mindestens ${MIN_SECRET_LENGTH} Zeichen) – z. B. mit \`openssl rand -hex 32\` erzeugen`)
    }
  }

  const password = env.PASSWORD
  if (mode === 'selfhosted') {
    if (!password) {
      errors.push('PASSWORD ist nicht gesetzt – im selfhosted-Modus ein eigenes Passwort in .env eintragen')
    } else if (PASSWORD_PLACEHOLDERS.includes(password)) {
      errors.push('PASSWORD ist ein bekannter Platzhalter – ein eigenes Passwort in .env eintragen')
    }
  }

  if (errors.length || !mode) return { errors, config: null }
  return {
    errors,
    config: mode === 'selfhosted'
      ? { mode, password: password!, jwtSecret: jwtSecret! }
      : { mode, jwtSecret },
  }
}
