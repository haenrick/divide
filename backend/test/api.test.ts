import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

process.env.NODE_ENV = 'test'
process.env.MODE = 'saas'
process.env.JWT_SECRET = 'test-secret-at-least-32-characters'
process.env.ADMIN_PASSWORD = 'admin-pw'
process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), 'divide-')), 'test.db')

const { default: app } = await import('../src/index.ts')

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...headers },
})
const call = (path: string, init?: RequestInit) => app.request(path, init)

async function makeRoom(name: string) {
  const r = await call('/api/rooms', json({ name }))
  assert.equal(r.status, 201)
  const room = await r.json() as { id: number; room_token: string }
  return { id: room.id, h: { 'X-Room-Token': room.room_token } }
}

async function addPerson(room: { id: number; h: Record<string, string> }, name: string) {
  const r = await call(`/api/activities/${room.id}/participants`, json({ name }, room.h))
  return (await r.json() as { id: number }).id
}

test('Room-Isolation: fremder Token, fehlender Token, globales Listing', async () => {
  const a = await makeRoom('A'), b = await makeRoom('B')
  assert.equal((await call(`/api/activities/${a.id}/participants`)).status, 401)
  assert.equal((await call(`/api/activities/${a.id}/participants`, { headers: b.h })).status, 403)
  assert.equal((await call(`/api/activities/${a.id}`, { method: 'DELETE', headers: b.h })).status, 403)
  assert.equal((await call(`/api/activities/${a.id}/participants`, { headers: a.h })).status, 200)
  assert.equal((await call('/api/activities')).status, 403)
})

test('Teilnehmer und Ausgaben lassen sich nur mit dem eigenen Token löschen', async () => {
  const a = await makeRoom('A2'), b = await makeRoom('B2')
  const pid = await addPerson(a, 'Anna')
  assert.equal((await call(`/api/participants/${pid}`, { method: 'DELETE', headers: b.h })).status, 403)
  assert.equal((await call(`/api/participants/${pid}`, { method: 'DELETE', headers: a.h })).status, 200)
})

test('Ausgaben: Zahler muss zur Gruppe gehören, Betrag muss gültige Zahl sein', async () => {
  const a = await makeRoom('A3'), b = await makeRoom('B3')
  const anna = await addPerson(a, 'Anna'), bob = await addPerson(b, 'Bob')
  const post = (body: unknown) => call(`/api/activities/${a.id}/expenses`, json(body, a.h))
  assert.equal((await post({ paid_by: anna, amount: 12.5, description: 'Pizza' })).status, 201)
  assert.equal((await post({ paid_by: bob, amount: 5 })).status, 400)          // fremder Zahler
  assert.equal((await post({ paid_by: 9999, amount: 5, description: 'Test' })).status, 400) // unbekannter Zahler (#2)
  const invalid = await post({ paid_by: anna, amount: '5' })                    // String
  assert.equal(invalid.status, 400)
  assert.deepEqual(await invalid.json(), { error: 'Ungültige Ausgabe' })
  assert.equal((await post({ paid_by: anna, amount: -1 })).status, 400)
  assert.equal((await post({ paid_by: anna, amount: 1e12 })).status, 400)
  assert.equal((await post({ paid_by: anna, amount: 5, description: 'x'.repeat(201) })).status, 400)
  const expenses = await (await call(`/api/activities/${a.id}/expenses`, { headers: a.h })).json() as unknown[]
  assert.equal(expenses.length, 1)                                              // nur die gültige Ausgabe
})

test('Ungültige Bodies auf POST-Routen → 400 statt 500 (#8)', async () => {
  const a = await makeRoom('A8')
  const anna = await addPerson(a, 'Anna')
  const raw = (path: string, body: string, headers: Record<string, string> = {}) =>
    call(path, { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers } })
  const routes: Array<[string, Record<string, string>]> = [
    ['/api/rooms', { 'x-forwarded-for': '198.51.100.8' }],
    [`/api/activities/${a.id}/participants`, a.h],
    [`/api/activities/${a.id}/expenses`, a.h],
  ]
  for (const [path, h] of routes) {
    for (const body of ['{bad', '', 'null', '[]', '5', '"x"']) {
      const r = await raw(path, body, h)
      assert.equal(r.status, 400, `${path} mit ${JSON.stringify(body)}`)
      assert.deepEqual(await r.json(), { error: 'Ungültiger JSON-Body' })
    }
  }
  for (const [path, h] of routes.slice(0, 2)) {
    const r = await raw(path, '{"name":123}', h)
    assert.equal(r.status, 400, `${path} mit name als Zahl`)
    assert.deepEqual(await r.json(), { error: 'Name fehlt' })
  }
  assert.equal((await raw(`/api/activities/${a.id}/expenses`, JSON.stringify({ paid_by: anna, amount: 5 }), a.h)).status, 201)
})

type Balances = {
  balances: Array<{ id: number; name: string; paid: number; share: number; net: number }>
  settlements: Array<{ from: string; to: string; amount: number }>
  total: number
}

async function groupWithExpenses(name: string, people: string[], expenses: Array<[string, number]>) {
  const room = await makeRoom(name)
  const ids: Record<string, number> = {}
  for (const p of people) ids[p] = await addPerson(room, p)
  for (const [payer, amount] of expenses) {
    const r = await call(`/api/activities/${room.id}/expenses`, json({ paid_by: ids[payer], amount }, room.h))
    assert.equal(r.status, 201)
  }
  return await (await call(`/api/activities/${room.id}/balances`, { headers: room.h })).json() as Balances
}

const cents = (x: number) => Math.round(x * 100)

// Alles muss in Cent exakt aufgehen
function assertBalanced(b: Balances) {
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
  assert.equal(sum(b.balances.map(p => cents(p.net))), 0, 'Summe net')
  assert.equal(sum(b.balances.map(p => cents(p.share))), cents(b.total), 'Summe share')
  for (const p of b.balances) {
    for (const x of [p.paid, p.share, p.net]) assert.equal(cents(x) / 100, x, `${p.name}: höchstens 2 Nachkommastellen`)
    const received = sum(b.settlements.filter(s => s.to === p.name).map(s => cents(s.amount)))
    const sent = sum(b.settlements.filter(s => s.from === p.name).map(s => cents(s.amount)))
    assert.equal(received - sent, cents(p.net), `Settlements gleichen ${p.name} aus`)
  }
}

const view = (b: Balances) => b.balances.map(p => [p.name, p.share, p.net])

test('Salden: Restcent geht an die ersten Teilnehmer, alles geht auf (#3)', async () => {
  // Szenario aus #3: 20,00 € auf 3 Personen → 2 Restcent
  const a = await groupWithExpenses('R1', ['Anna', 'Ben', 'Cara'], [['Anna', 10], ['Anna', 10]])
  assert.deepEqual(view(a), [['Anna', 6.67, 13.33], ['Ben', 6.67, -6.67], ['Cara', 6.66, -6.66]])
  assert.deepEqual(a.settlements, [{ from: 'Ben', to: 'Anna', amount: 6.67 }, { from: 'Cara', to: 'Anna', amount: 6.66 }])
  assertBalanced(a)

  // 10,00 € auf 3 Personen → 1 Restcent
  const b = await groupWithExpenses('R2', ['Anna', 'Ben', 'Cara'], [['Ben', 10]])
  assert.deepEqual(view(b), [['Anna', 3.34, -3.34], ['Ben', 3.33, 6.67], ['Cara', 3.33, -3.33]])
  assertBalanced(b)

  // Mehrere Zahler, 35,51 € auf 4 Personen → 3 Restcent
  const c = await groupWithExpenses('R3', ['Anna', 'Ben', 'Cara', 'Dan'], [['Anna', 25], ['Ben', 10.01], ['Cara', 0.5]])
  assert.deepEqual(view(c), [['Anna', 8.88, 16.12], ['Ben', 8.88, 1.13], ['Cara', 8.88, -8.38], ['Dan', 8.87, -8.87]])
  assert.equal(c.total, 35.51)
  assert.deepEqual(c.balances.map(p => p.paid), [25, 10.01, 0.5, 0])
  assertBalanced(c)
})

test('Admin-Login: falsches Passwort 401, richtiges 200, Rate-Limit greift', async () => {
  const ip = { 'x-forwarded-for': '203.0.113.7' }
  assert.equal((await call('/api/admin/login', json({ password: 'nope' }, ip))).status, 401)
  assert.equal((await call('/api/admin/login', json({ password: 'admin-pw' }, ip))).status, 200)
  let last = 0
  for (let i = 0; i < 12; i++) last = (await call('/api/admin/login', json({ password: 'nope' }, ip))).status
  assert.equal(last, 429)
  // andere IP ist nicht betroffen
  assert.equal((await call('/api/admin/login', json({ password: 'nope' }, { 'x-forwarded-for': '198.51.100.1' }))).status, 401)
})

test('Admin-Endpunkte ohne Cookie sind gesperrt', async () => {
  assert.equal((await call('/api/admin/activities')).status, 401)
})
