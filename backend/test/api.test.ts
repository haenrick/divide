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
