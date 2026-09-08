import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { sign, verify } from 'hono/jwt'
import { mkdirSync } from 'fs'
import { randomBytes } from 'crypto'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { Resend } from 'resend'
import db, { cleanupExpiredRooms } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })
mkdirSync(join(__dirname, '../../data'), { recursive: true })

const PASSWORD       = process.env.PASSWORD       ?? 'geheim'
const JWT_SECRET     = process.env.JWT_SECRET     ?? 'dev-secret'
const MODE           = process.env.MODE           ?? 'selfhosted'
const PORT           = Number(process.env.PORT ?? 3000)
const APP_URL        = process.env.APP_URL        ?? 'https://divide-it.app'
const RESEND_KEY     = process.env.RESEND_API_KEY
const RESEND_FROM    = process.env.RESEND_FROM    ?? 'DIVIDE <noreply@divide-it.app>'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null

// Frontend und Backend laufen immer same-origin (Docker: gemeinsam ausgeliefert;
// Dev: Vite-Proxy) — Cross-Origin-Zugriff ist nur nötig, wenn explizit eine
// andere Origin per ALLOWED_ORIGINS konfiguriert wird. "*" + Credentials ist
// spec-widrig und wird von Browsern ohnehin ignoriert, daher feste Allowlist.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)

const app = new Hono()
app.use('*', cors({
  origin: (origin) => ALLOWED_ORIGINS.includes(origin) ? origin : '',
  credentials: true,
}))

// Beim Start abgelaufene Rooms löschen, danach täglich
cleanupExpiredRooms()
setInterval(cleanupExpiredRooms, 24 * 60 * 60 * 1000)

// ─── Config ─────────────────────────────────────────────────────────────────

app.get('/api/config', (c) => c.json({ mode: MODE }))

// ─── Auth (nur selfhosted) ───────────────────────────────────────────────────

if (MODE === 'selfhosted') {
  app.post('/api/login', async (c) => {
    const { password } = await c.req.json()
    if (password !== PASSWORD) return c.json({ error: 'Falsches Passwort' }, 401)
    const token = await sign({ sub: 'user', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, JWT_SECRET)
    setCookie(c, 'token', token, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
    return c.json({ ok: true })
  })

  app.post('/api/logout', (c) => {
    deleteCookie(c, 'token', { path: '/' })
    return c.json({ ok: true })
  })

  app.use('/api/*', async (c, next) => {
    if (c.req.path === '/api/config' || c.req.path.startsWith('/api/admin/')) return next()
    const token = getCookie(c, 'token')
    if (!token) return c.json({ error: 'Nicht eingeloggt' }, 401)
    try {
      await verify(token, JWT_SECRET, 'HS256')
      await next()
    } catch {
      return c.json({ error: 'Session abgelaufen' }, 401)
    }
  })
}

// ─── Admin (Übersicht über alle Gruppen, unabhängig vom MODE) ────────────────
// Eigenes Passwort/JWT, getrennt von der normalen Auth bzw. den Room-Tokens.

app.post('/api/admin/login', async (c) => {
  if (!ADMIN_PASSWORD) return c.json({ error: 'Admin-Zugang nicht konfiguriert' }, 503)
  const { password } = await c.req.json()
  if (password !== ADMIN_PASSWORD) return c.json({ error: 'Falsches Passwort' }, 401)
  const token = await sign({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 }, JWT_SECRET)
  setCookie(c, 'admin_token', token, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 12 })
  return c.json({ ok: true })
})

app.post('/api/admin/logout', (c) => {
  deleteCookie(c, 'admin_token', { path: '/' })
  return c.json({ ok: true })
})

app.use('/api/admin/*', async (c, next) => {
  if (c.req.path === '/api/admin/login') return next()
  const token = getCookie(c, 'admin_token')
  if (!token) return c.json({ error: 'Nicht eingeloggt' }, 401)
  try {
    const payload = await verify(token, JWT_SECRET, 'HS256')
    if (payload.sub !== 'admin') throw new Error('not admin')
    await next()
  } catch {
    return c.json({ error: 'Session abgelaufen' }, 401)
  }
})

app.get('/api/admin/activities', (c) => {
  const activities = db.prepare(`
    SELECT a.*,
      COUNT(DISTINCT p.id) as participant_count,
      COUNT(DISTINCT e.id) as expense_count,
      COALESCE(SUM(e.amount), 0) as total
    FROM activities a
    LEFT JOIN participants p ON p.activity_id = a.id
    LEFT JOIN expenses e ON e.activity_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `).all()
  return c.json(activities)
})

app.delete('/api/admin/activities/:id', (c) => {
  db.prepare('DELETE FROM activities WHERE id = ?').run(Number(c.req.param('id')))
  return c.json({ ok: true })
})

// ─── Rooms (saas) ────────────────────────────────────────────────────────────

app.post('/api/rooms', async (c) => {
  const { name, email } = await c.req.json()
  if (!name?.trim()) return c.json({ error: 'Name required' }, 400)
  const token = randomBytes(5).toString('hex')
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
  const result = db.prepare(
    'INSERT INTO activities (name, room_token, expires_at) VALUES (?, ?, ?)'
  ).run(name.trim(), token, expires_at)
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid)

  if (email && resend) {
    const url = `${APP_URL}/#/r/${token}`
    resend.emails.send({
      from: RESEND_FROM,
      to: [email],
      subject: `DIVIDE // ${name.trim()}`,
      html: `<div style="background:#000;color:#00ff88;font-family:monospace;padding:32px;max-width:480px">
        <div style="font-size:24px;font-weight:700;letter-spacing:0.2em;margin-bottom:24px">DIVIDE_</div>
        <div style="color:#aaa;margin-bottom:8px">// dein link zur gruppe</div>
        <div style="color:#00ff88;font-size:18px;font-weight:700;margin-bottom:24px">${name.trim()}</div>
        <a href="${url}" style="display:block;background:#00ff88;color:#000;text-decoration:none;padding:12px 20px;font-weight:700;letter-spacing:2px;margin-bottom:24px">&gt; gruppe öffnen</a>
        <div style="color:#333;font-size:11px;letter-spacing:1px">${url}</div>
        <div style="color:#222;font-size:10px;margin-top:24px;letter-spacing:1px">// gruppe wird nach 30 tagen automatisch gelöscht</div>
      </div>`,
    }).catch(() => {}) // Email-Fehler sind nicht kritisch
  }

  return c.json(activity, 201)
})

app.get('/api/rooms/:token', (c) => {
  const token = c.req.param('token')
  const activity = db.prepare(
    `SELECT * FROM activities WHERE room_token = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`
  ).get(token)
  if (!activity) return c.json({ error: 'Room nicht gefunden oder abgelaufen' }, 404)
  return c.json(activity)
})

// ─── Room-Isolation (nur saas) ───────────────────────────────────────────────
// Jede Aktivität ist per Room-Token vor fremdem Zugriff geschützt.
// Der Client schickt den Token im Header X-Room-Token mit.

function activityIdOfParticipant(id: number) {
  const row = db.prepare('SELECT activity_id FROM participants WHERE id = ?').get(id) as { activity_id: number } | undefined
  return row?.activity_id
}

function activityIdOfExpense(id: number) {
  const row = db.prepare('SELECT activity_id FROM expenses WHERE id = ?').get(id) as { activity_id: number } | undefined
  return row?.activity_id
}

function requireRoomToken(getActivityId: (c: Context) => number | undefined) {
  return async (c: Context, next: Next) => {
    const activityId = getActivityId(c)
    if (!activityId) return c.json({ error: 'Nicht gefunden' }, 404)
    const token = c.req.header('X-Room-Token')
    if (!token) return c.json({ error: 'Room-Token fehlt' }, 401)
    const room = db.prepare(
      `SELECT id FROM activities WHERE id = ? AND room_token = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`
    ).get(activityId, token)
    if (!room) return c.json({ error: 'Ungültiger Room-Token' }, 403)
    await next()
  }
}

if (MODE === 'saas') {
  app.use('/api/activities/:id', requireRoomToken((c) => Number(c.req.param('id'))))
  app.use('/api/activities/:id/*', requireRoomToken((c) => Number(c.req.param('id'))))
  app.use('/api/participants/:id', requireRoomToken((c) => activityIdOfParticipant(Number(c.req.param('id')))))
  app.use('/api/expenses/:id', requireRoomToken((c) => activityIdOfExpense(Number(c.req.param('id')))))
}

// ─── Activities ──────────────────────────────────────────────────────────────

app.get('/api/activities', (c) => {
  // Globales Listing gibt es nur im selfhosted-Modus — im saas-Modus würde es
  // fremde Gruppen aller Nutzer offenlegen.
  if (MODE === 'saas') return c.json({ error: 'Nicht verfügbar' }, 403)
  const activities = db.prepare('SELECT * FROM activities ORDER BY created_at DESC').all()
  return c.json(activities)
})

app.post('/api/activities', async (c) => {
  if (MODE === 'saas') return c.json({ error: 'Nicht verfügbar, nutze /api/rooms' }, 403)
  const { name } = await c.req.json()
  if (!name?.trim()) return c.json({ error: 'Name required' }, 400)
  const result = db.prepare('INSERT INTO activities (name) VALUES (?)').run(name.trim())
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid)
  return c.json(activity, 201)
})

app.delete('/api/activities/:id', (c) => {
  const id = Number(c.req.param('id'))
  db.prepare('DELETE FROM activities WHERE id = ?').run(id)
  return c.json({ ok: true })
})

// ─── Participants ────────────────────────────────────────────────────────────

app.get('/api/activities/:id/participants', (c) => {
  const id = Number(c.req.param('id'))
  return c.json(db.prepare('SELECT * FROM participants WHERE activity_id = ?').all(id))
})

app.post('/api/activities/:id/participants', async (c) => {
  const activity_id = Number(c.req.param('id'))
  const { name } = await c.req.json()
  if (!name?.trim()) return c.json({ error: 'Name required' }, 400)
  const result = db.prepare('INSERT INTO participants (activity_id, name) VALUES (?, ?)').run(activity_id, name.trim())
  return c.json(db.prepare('SELECT * FROM participants WHERE id = ?').get(result.lastInsertRowid), 201)
})

app.delete('/api/participants/:id', (c) => {
  db.prepare('DELETE FROM participants WHERE id = ?').run(Number(c.req.param('id')))
  return c.json({ ok: true })
})

// ─── Expenses ────────────────────────────────────────────────────────────────

app.get('/api/activities/:id/expenses', (c) => {
  const id = Number(c.req.param('id'))
  return c.json(db.prepare(`
    SELECT e.*, p.name as paid_by_name FROM expenses e
    JOIN participants p ON e.paid_by = p.id
    WHERE e.activity_id = ? ORDER BY e.created_at DESC
  `).all(id))
})

app.post('/api/activities/:id/expenses', async (c) => {
  const activity_id = Number(c.req.param('id'))
  const { paid_by, amount, description } = await c.req.json()
  if (!paid_by || !amount || amount <= 0) return c.json({ error: 'Invalid expense' }, 400)
  const result = db.prepare(
    'INSERT INTO expenses (activity_id, paid_by, amount, description) VALUES (?, ?, ?, ?)'
  ).run(activity_id, paid_by, amount, description ?? '')
  return c.json(db.prepare(`
    SELECT e.*, p.name as paid_by_name FROM expenses e
    JOIN participants p ON e.paid_by = p.id WHERE e.id = ?
  `).get(result.lastInsertRowid), 201)
})

app.delete('/api/expenses/:id', (c) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(c.req.param('id')))
  return c.json({ ok: true })
})

// ─── Balances ────────────────────────────────────────────────────────────────

app.get('/api/activities/:id/balances', (c) => {
  const id = Number(c.req.param('id'))
  const participants = db.prepare('SELECT * FROM participants WHERE activity_id = ?').all(id) as Array<{ id: number; name: string }>
  const expenses = db.prepare('SELECT * FROM expenses WHERE activity_id = ?').all(id) as Array<{ paid_by: number; amount: number }>

  if (participants.length === 0) return c.json({ balances: [], settlements: [], total: 0 })

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const share = total / participants.length

  const net: Record<number, number> = {}
  for (const p of participants) net[p.id] = -share
  for (const e of expenses) net[e.paid_by] = (net[e.paid_by] ?? 0) + e.amount

  const creditors = participants.filter(p => net[p.id] > 0.005).map(p => ({ ...p, amount: net[p.id] }))
  const debtors   = participants.filter(p => net[p.id] < -0.005).map(p => ({ ...p, amount: -net[p.id] }))

  const settlements: Array<{ from: string; to: string; amount: number }> = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount)
    if (pay > 0.005) settlements.push({ from: debtors[i].name, to: creditors[j].name, amount: Math.round(pay * 100) / 100 })
    debtors[i].amount -= pay
    creditors[j].amount -= pay
    if (debtors[i].amount < 0.005) i++
    if (creditors[j].amount < 0.005) j++
  }

  return c.json({
    balances: participants.map(p => ({
      id: p.id, name: p.name,
      paid: expenses.filter(e => e.paid_by === p.id).reduce((s, e) => s + e.amount, 0),
      share, net: Math.round(net[p.id] * 100) / 100,
    })),
    settlements,
    total: Math.round(total * 100) / 100,
  })
})

// ─── Frontend ────────────────────────────────────────────────────────────────

app.use('/*', serveStatic({ root: join(__dirname, '../../frontend/dist') }))

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[DIVIDE] Server running on http://localhost:${PORT} (mode: ${MODE})`)
})
