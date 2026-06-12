import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeConnectionStatus,
  nextRetryDelay,
  isNetworkError,
  STALE_WARN_MS,
  RETRY_BASE_MS,
  RETRY_MAX_MS
} from './connectionHealth.js'

const NOW = 10_000_000

function status(overrides = {}) {
  return computeConnectionStatus({
    navigatorOnline: true,
    healthOk: true,
    authed: true,
    lastSyncAt: NOW - 1_000,
    now: NOW,
    ...overrides
  })
}

test('ok when online, healthy and fresh', () => {
  assert.equal(status(), 'ok')
})

test('offline wins over everything else', () => {
  assert.equal(status({ navigatorOnline: false, healthOk: false, lastSyncAt: 1 }), 'offline')
})

test('server when online but health check failed', () => {
  assert.equal(status({ healthOk: false }), 'server')
  assert.equal(status({ healthOk: false, lastSyncAt: 1 }), 'server')
})

test('stale when last sync is older than threshold', () => {
  assert.equal(status({ lastSyncAt: NOW - STALE_WARN_MS - 1 }), 'stale')
  assert.equal(status({ lastSyncAt: NOW - STALE_WARN_MS + 1_000 }), 'ok')
})

test('stale respects custom threshold', () => {
  assert.equal(status({ lastSyncAt: NOW - 5_000, staleMs: 4_000 }), 'stale')
  assert.equal(status({ lastSyncAt: NOW - 5_000, staleMs: 6_000 }), 'ok')
})

test('never stale without auth or without a first sync', () => {
  assert.equal(status({ authed: false, lastSyncAt: NOW - STALE_WARN_MS * 10 }), 'ok')
  assert.equal(status({ lastSyncAt: 0 }), 'ok')
})

test('retry delay backs off exponentially and caps', () => {
  assert.equal(nextRetryDelay(1), RETRY_BASE_MS)
  assert.equal(nextRetryDelay(2), RETRY_BASE_MS * 2)
  assert.equal(nextRetryDelay(3), RETRY_BASE_MS * 4)
  assert.equal(nextRetryDelay(4), RETRY_MAX_MS)
  assert.equal(nextRetryDelay(99), RETRY_MAX_MS)
})

test('retry delay tolerates garbage input', () => {
  assert.equal(nextRetryDelay(0), RETRY_BASE_MS)
  assert.equal(nextRetryDelay(-5), RETRY_BASE_MS)
  assert.equal(nextRetryDelay(undefined), RETRY_BASE_MS)
})

test('isNetworkError matches fetch-level failures', () => {
  assert.equal(isNetworkError(new TypeError('Failed to fetch')), true)
  assert.equal(isNetworkError({ name: 'AbortError', message: 'aborted' }), true)
  assert.equal(isNetworkError({ name: 'Error', message: 'Load failed' }), true)
  assert.equal(isNetworkError({ name: 'Error', message: 'NetworkError when attempting to fetch resource.' }), true)
})

test('isNetworkError ignores server-side errors', () => {
  assert.equal(isNetworkError(null), false)
  assert.equal(isNetworkError({ name: 'PostgrestError', message: 'permission denied' }), false)
  assert.equal(isNetworkError(new Error('duplicate key value')), false)
})
