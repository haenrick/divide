import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAmount } from '../src/lib/amount.ts'

test('parseAmount: gültige Beträge', () => {
  const valid: Array<[string, number]> = [
    ['12', 12], ['12,5', 12.5], ['12.50', 12.5], ['0,07', 0.07], ['0.01', 0.01],
    [' 19,99 ', 19.99], ['999999999,99', 999999999.99],
  ]
  for (const [input, expected] of valid) assert.equal(parseAmount(input), expected, input)
})

test('parseAmount: ungültige Beträge', () => {
  const invalid = ['', ' ', '0', '0,00', '-5', 'abc', '12abc', '12,345', '1.234,56',
    '12,', ',5', '1e3', '1000000000', '12 34']
  for (const input of invalid) assert.equal(parseAmount(input), null, JSON.stringify(input))
})
