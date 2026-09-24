import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeConnectionStatus,
  nextRetryDelay,
  isNetworkError,
  createTimeoutFetch,
  firstQueryError,
  wakeRealtime,
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

test('isNetworkError erkennt Timeout-/Abort-Fehler aus supabase-js', () => {
  assert.equal(isNetworkError(new Error('TimeoutError: Request timed out')), true)
  assert.equal(isNetworkError(new Error('AbortError: signal is aborted without reason')), true)
  assert.equal(isNetworkError(new Error('TypeError: Failed to fetch')), true)
})

test('createTimeoutFetch reicht Antwort und Optionen durch', async () => {
  let seen
  const f = createTimeoutFetch(async (input, init) => { seen = { input, init }; return 'ok' }, 1_000)
  assert.equal(await f('https://x/rest', { method: 'POST', cache: 'no-store' }), 'ok')
  assert.equal(seen.input, 'https://x/rest')
  assert.equal(seen.init.method, 'POST')
  assert.equal(seen.init.cache, 'no-store')
  assert.ok(seen.init.signal instanceof AbortSignal)
})

function hangingFetch(_input, init) {
  return new Promise((_, reject) => {
    if (init.signal.aborted) return reject(init.signal.reason)
    init.signal.addEventListener('abort', () => reject(init.signal.reason))
  })
}

test('createTimeoutFetch bricht hängende Requests nach Timeout ab', async () => {
  const f = createTimeoutFetch(hangingFetch, 20)
  await assert.rejects(f('https://x'), (e) => {
    assert.equal(e.name, 'TimeoutError')
    assert.equal(isNetworkError(e), true)
    return true
  })
})

test('createTimeoutFetch respektiert ein äußeres AbortSignal', async () => {
  const f = createTimeoutFetch(hangingFetch, 10_000)
  const outer = new AbortController()
  const p = f('https://x', { signal: outer.signal })
  outer.abort(new Error('manual'))
  await assert.rejects(p, /manual/)

  const pre = new AbortController()
  pre.abort(new Error('already'))
  await assert.rejects(f('https://x', { signal: pre.signal }), /already/)
})

test('firstQueryError liefert ersten Supabase-Fehler als Error', () => {
  assert.equal(firstQueryError([{ data: 1, error: null }, { data: [] }]), null)
  assert.equal(firstQueryError(undefined), null)
  const raw = { message: 'TypeError: Failed to fetch', code: '' }
  const e = firstQueryError([{ data: 1 }, { data: null, error: raw }, { error: { message: 'other' } }])
  assert.ok(e instanceof Error)
  assert.equal(e.message, 'TypeError: Failed to fetch')
  assert.equal(e.cause, raw)
  assert.equal(isNetworkError(e), true)
})

function fakeRealtime({ connected, channels = 1 }) {
  const calls = []
  return {
    calls,
    getChannels: () => Array.from({ length: channels }),
    isConnected: () => connected,
    connect: () => calls.push('connect'),
    sendHeartbeat: () => calls.push('heartbeat'),
  }
}

test('wakeRealtime verbindet getrennte Sockets neu', () => {
  const rt = fakeRealtime({ connected: false })
  assert.equal(wakeRealtime(rt), true)
  assert.deepEqual(rt.calls, ['connect'])
})

test('wakeRealtime prüft offene Sockets per Heartbeat', () => {
  const rt = fakeRealtime({ connected: true })
  assert.equal(wakeRealtime(rt), true)
  assert.deepEqual(rt.calls, ['heartbeat'])
})

test('wakeRealtime öffnet ohne Kanäle keinen Socket', () => {
  const rt = fakeRealtime({ connected: false, channels: 0 })
  assert.equal(wakeRealtime(rt), false)
  assert.deepEqual(rt.calls, [])
  assert.equal(wakeRealtime(null), false)
  assert.equal(wakeRealtime({ getChannels: () => { throw new Error('x') } }), false)
})
