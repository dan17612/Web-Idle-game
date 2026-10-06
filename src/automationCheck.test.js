import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTOMATION_RULES,
  analyzeClicks,
  createClickSampler,
  isAutomationLockError,
  normalizeAutomationStatus,
  reasonKey,
  sanitizeCode
} from './automationCheck.js'

// Deterministischer Zufall, damit die „Mensch“-Serien stabil bleiben.
function rng(seed = 7) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

function series(n, { start = 1000, gap = 120, jitterMs = 0, x = 200, y = 300, jitterPx = 0, seed = 7 } = {}) {
  const r = rng(seed)
  const out = []
  let t = start
  for (let i = 0; i < n; i++) {
    out.push({ t, x: x + (r() - 0.5) * 2 * jitterPx, y: y + (r() - 0.5) * 2 * jitterPx })
    t += gap + (r() - 0.5) * 2 * jitterMs
  }
  return out
}

test('autoclicker: same pixel, constant rhythm → suspicious', () => {
  const res = analyzeClicks(series(30, { gap: 100, jitterMs: 2 }))
  assert.equal(res.suspicious, true)
  assert.equal(res.n, 30)
  assert.equal(res.spread_px, 0)
  assert.ok(res.sd_ms <= 8)
})

test('slow autoclicker (1 click/s, a little timer jitter) is caught via the relative limit', () => {
  const res = analyzeClicks(series(30, { gap: 1000, jitterMs: 25 }))
  assert.equal(res.suspicious, true)
})

test('human tapping a phone: fingers move, rhythm varies → not suspicious', () => {
  const res = analyzeClicks(series(30, { gap: 140, jitterMs: 45, jitterPx: 12 }))
  assert.equal(res.suspicious, false)
})

test('mouse resting on the button but human rhythm → not suspicious', () => {
  const res = analyzeClicks(series(30, { gap: 150, jitterMs: 40, jitterPx: 0 }))
  assert.equal(res.spread_px, 0)
  assert.equal(res.suspicious, false)
})

test('perfect rhythm but moving pointer → not suspicious', () => {
  const res = analyzeClicks(series(30, { gap: 100, jitterMs: 1, jitterPx: 6 }))
  assert.equal(res.suspicious, false)
})

test('too few clicks or a long pause → no verdict', () => {
  assert.equal(analyzeClicks(series(29, { gap: 100 })), null)
  const withPause = series(30, { gap: 100 })
  for (let i = 15; i < withPause.length; i++) withPause[i].t += AUTOMATION_RULES.click_max_gap_ms + 1
  assert.equal(analyzeClicks(withPause), null)
  assert.equal(analyzeClicks(null), null)
})

test('sampler reports once, then waits for the cooldown', () => {
  let clock = 0
  const reports = []
  const sampler = createClickSampler({ onPattern: (s) => reports.push(s), now: () => clock })
  for (const s of series(30, { gap: 100 })) sampler.record(s)
  assert.equal(reports.length, 1)
  assert.equal(sampler.size(), 0, 'series restarts after a report')

  clock += 10_000
  for (const s of series(30, { start: 10_000, gap: 100 })) sampler.record(s)
  assert.equal(reports.length, 1, 'cooldown not over')

  clock += AUTOMATION_RULES.click_report_cooldown_s * 1000
  for (const s of series(30, { start: 30_000, gap: 100 })) sampler.record(s)
  assert.equal(reports.length, 2)
})

test('sampler accepts pointer events and resets on pauses', () => {
  const reports = []
  const sampler = createClickSampler({ onPattern: (s) => reports.push(s), now: () => 0 })
  sampler.record({ timeStamp: 1000, clientX: 5, clientY: 5 })
  sampler.record({ timeStamp: 1100, clientX: 5, clientY: 5 })
  assert.equal(sampler.size(), 2)
  sampler.record({ timeStamp: 1100 + AUTOMATION_RULES.click_max_gap_ms + 1, clientX: 5, clientY: 5 })
  assert.equal(sampler.size(), 1)
  sampler.record({ timeStamp: NaN, clientX: 5, clientY: 5 })
  assert.equal(sampler.size(), 1)
  assert.equal(reports.length, 0)
})

test('lock error detection', () => {
  assert.equal(isAutomationLockError({ message: 'automation_check_required' }), true)
  assert.equal(isAutomationLockError('automation_check_required'), true)
  assert.equal(isAutomationLockError(new Error('insufficient coins')), false)
  assert.equal(isAutomationLockError(null), false)
})

test('code input keeps only four digits', () => {
  assert.equal(sanitizeCode(' 12-34 '), '1234')
  assert.equal(sanitizeCode('12345'), '1234')
  assert.equal(sanitizeCode('ab7'), '7')
  assert.equal(sanitizeCode(null), '')
})

test('status normalization', () => {
  assert.equal(normalizeAutomationStatus(null), null)
  assert.equal(normalizeAutomationStatus({ pending: false }), null)
  const s = normalizeAutomationStatus({
    pending: true, id: 3, code: '0042', reason: 'dauerlauf', details: { active_slots: 95 },
    ticket_number: 'ST-20261006-00001', attempts: 2, max_attempts: 5, created_at: '2026-10-06T10:00:00Z'
  })
  assert.deepEqual(s, {
    id: 3, code: '0042', reason: 'dauerlauf', details: { active_slots: 95 },
    ticketNumber: 'ST-20261006-00001', attempts: 2, maxAttempts: 5, createdAt: '2026-10-06T10:00:00Z'
  })
  assert.equal(reasonKey('evil'), 'unknown')
})
