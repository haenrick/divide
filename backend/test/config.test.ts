import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateConfig } from '../src/config.ts'

const SECRET = 'a'.repeat(32)

test('selfhosted: gültige Konfiguration', () => {
  const { errors, config } = validateConfig({ MODE: 'selfhosted', PASSWORD: 'pw', JWT_SECRET: SECRET })
  assert.deepEqual(errors, [])
  assert.deepEqual(config, { mode: 'selfhosted', password: 'pw', jwtSecret: SECRET })
})

test('MODE fehlt → selfhosted', () => {
  const { errors, config } = validateConfig({ PASSWORD: 'pw', JWT_SECRET: SECRET })
  assert.deepEqual(errors, [])
  assert.equal(config?.mode, 'selfhosted')
})

test('MODE wird getrimmt', () => {
  const { errors, config } = validateConfig({ MODE: 'saas ' })
  assert.deepEqual(errors, [])
  assert.equal(config?.mode, 'saas')
})

test('ungültiger MODE bricht ab', () => {
  for (const MODE of ['', ' ', 'SaaS', 'Selfhosted', 'foo']) {
    const { errors, config } = validateConfig({ MODE, PASSWORD: 'pw', JWT_SECRET: SECRET })
    assert.equal(config, null, `MODE=${JSON.stringify(MODE)}`)
    assert.equal(errors.length, 1)
    assert.match(errors[0], /MODE/)
  }
})

test('saas ohne ADMIN_PASSWORD braucht kein JWT_SECRET', () => {
  const { errors, config } = validateConfig({ MODE: 'saas' })
  assert.deepEqual(errors, [])
  assert.deepEqual(config, { mode: 'saas', jwtSecret: undefined })
})

test('saas mit ADMIN_PASSWORD braucht JWT_SECRET', () => {
  assert.equal(validateConfig({ MODE: 'saas', ADMIN_PASSWORD: 'x' }).errors.length, 1)
  const { errors, config } = validateConfig({ MODE: 'saas', ADMIN_PASSWORD: 'x', JWT_SECRET: SECRET })
  assert.deepEqual(errors, [])
  assert.equal(config?.jwtSecret, SECRET)
})

test('JWT_SECRET: fehlend, zu kurz oder Platzhalter', () => {
  const bad = [undefined, '', 'a'.repeat(31), 'dev-secret',
    'langer-zufaelliger-string-hier-einsetzen', 'langer-zufaelliger-string']
  for (const JWT_SECRET of bad) {
    const { errors, config } = validateConfig({ MODE: 'selfhosted', PASSWORD: 'pw', JWT_SECRET })
    assert.equal(config, null, `JWT_SECRET=${JSON.stringify(JWT_SECRET)}`)
    assert.equal(errors.length, 1)
    assert.match(errors[0], /JWT_SECRET/)
  }
})

test('PASSWORD im selfhosted-Modus: fehlend, leer oder Platzhalter', () => {
  for (const PASSWORD of [undefined, '', 'geheim', 'dein-passwort']) {
    const { errors, config } = validateConfig({ MODE: 'selfhosted', PASSWORD, JWT_SECRET: SECRET })
    assert.equal(config, null, `PASSWORD=${JSON.stringify(PASSWORD)}`)
    assert.equal(errors.length, 1)
    assert.match(errors[0], /PASSWORD/)
  }
})

test('alle Fehler auf einmal, ohne Secret-Werte', () => {
  const { errors } = validateConfig({ MODE: 'selfhosted', PASSWORD: 'geheim', JWT_SECRET: 'dev-secret' })
  assert.equal(errors.length, 2)
  for (const e of errors) {
    assert.doesNotMatch(e, /geheim|dev-secret/)
  }
})
