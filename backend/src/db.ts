import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH ?? join(__dirname, '../../data/divide.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    room_token TEXT UNIQUE,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    paid_by INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// Migrations für bestehende DBs (selfhosted)
try { db.exec(`ALTER TABLE activities ADD COLUMN room_token TEXT UNIQUE`) } catch {}
try { db.exec(`ALTER TABLE activities ADD COLUMN expires_at TEXT`) } catch {}

export function cleanupExpiredRooms() {
  const result = db.prepare(`DELETE FROM activities WHERE expires_at IS NOT NULL AND expires_at < datetime('now')`).run()
  if (result.changes > 0) console.log(`[DIVIDE] ${result.changes} abgelaufene Room(s) gelöscht`)
}

export default db
