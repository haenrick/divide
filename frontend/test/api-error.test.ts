import { test } from 'node:test'
import assert from 'node:assert/strict'
import { errorMessage } from '../src/lib/api.ts'

test('errorMessage: nimmt das Feld error aus der JSON-Antwort', () => {
  assert.equal(errorMessage('{"error":"Ungültige Ausgabe"}'), 'Ungültige Ausgabe')
})

test('errorMessage: Rohtext, wenn die Antwort kein passendes JSON ist', () => {
  assert.equal(errorMessage('Internal Server Error'), 'Internal Server Error')
  assert.equal(errorMessage('{"message":"x"}'), '{"message":"x"}')
  assert.equal(errorMessage('{"error":42}'), '{"error":42}')
  assert.equal(errorMessage('null'), 'null')
  assert.equal(errorMessage(''), '')
})
