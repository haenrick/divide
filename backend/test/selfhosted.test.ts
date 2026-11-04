import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// Eigene Datei, weil MODE beim Import feststeht; node --test startet jede Datei in einem eigenen Prozess
process.env.NODE_ENV = 'test'
process.env.MODE = 'selfhosted'
process.env.PASSWORD = 'selfhosted-test-pw'
process.env.JWT_SECRET = 'selfhosted-test-secret-at-least-32-chars'
delete process.env.ADMIN_PASSWORD
process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), 'divide-')), 'test.db')

const { default: app } = await import('../src/index.ts')

async function login() {
  const r = await app.request('/api/login', {
    method: 'POST', body: JSON.stringify({ password: 'selfhosted-test-pw' }),
    headers: { 'content-type': 'application/json' },
  })
  assert.equal(r.status, 200)
  const cookie = r.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie)
  return cookie
}

test('selfhosted: ungültige Bodies auf POST /api/activities → 400 (#8)', async () => {
  const cookie = await login()
  const post = (body: string) => app.request('/api/activities', {
    method: 'POST', body, headers: { 'content-type': 'application/json', cookie },
  })
  for (const body of ['{bad', '', 'null', '[]', '5', '"x"']) {
    const r = await post(body)
    assert.equal(r.status, 400, `Body ${JSON.stringify(body)}`)
    assert.deepEqual(await r.json(), { error: 'Ungültiger JSON-Body' })
  }
  const r = await post('{"name":123}')
  assert.equal(r.status, 400)
  assert.deepEqual(await r.json(), { error: 'Name fehlt' })
  assert.equal((await post('{"name":"Urlaub"}')).status, 201)
})
