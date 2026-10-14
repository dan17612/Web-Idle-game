import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeChestQty, loadChestQty, saveChestQty, CHEST_QTY_KEYS } from './chestQty.js'

function fakeStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v))
  }
}

test('nur 1, 2 und 5 sind gültige Mengen', () => {
  assert.equal(normalizeChestQty('5'), 5)
  assert.equal(normalizeChestQty(2), 2)
  assert.equal(normalizeChestQty('3'), 1)
  assert.equal(normalizeChestQty(null), 1)
  assert.equal(normalizeChestQty('abc'), 1)
})

test('gespeicherte Menge kommt beim nächsten Laden zurück, je Shop getrennt', () => {
  globalThis.localStorage = fakeStorage()
  try {
    assert.equal(loadChestQty(CHEST_QTY_KEYS.shop), 1)
    saveChestQty(CHEST_QTY_KEYS.shop, 5)
    saveChestQty(CHEST_QTY_KEYS.tickets, 2)
    assert.equal(loadChestQty(CHEST_QTY_KEYS.shop), 5)
    assert.equal(loadChestQty(CHEST_QTY_KEYS.tickets), 2)
  } finally {
    delete globalThis.localStorage
  }
})

test('ohne oder mit kaputtem localStorage gilt 1', () => {
  assert.equal(loadChestQty(CHEST_QTY_KEYS.shop), 1)
  globalThis.localStorage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  try {
    assert.equal(loadChestQty(CHEST_QTY_KEYS.shop), 1)
    assert.doesNotThrow(() => saveChestQty(CHEST_QTY_KEYS.shop, 5))
  } finally {
    delete globalThis.localStorage
  }
})
