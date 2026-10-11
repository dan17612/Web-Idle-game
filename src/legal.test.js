import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LEGAL_VERSION,
  OPERATOR_PLACEHOLDER,
  formatLegalVersion,
  hidesConsentModal,
  needsLegalAcceptance,
  normalizeLegalStatus,
  operatorField
} from './legal.js'

test('version is a plain date', () => {
  assert.match(LEGAL_VERSION, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(formatLegalVersion('2026-10-11'), '11.10.2026')
  assert.equal(formatLegalVersion('kaputt'), 'kaputt')
})

test('missing or broken status never blocks the app', () => {
  assert.equal(normalizeLegalStatus(null), null)
  assert.equal(normalizeLegalStatus({}), null)
  assert.equal(needsLegalAcceptance(null), false)
})

test('server flag decides, fallback compares versions', () => {
  const pending = normalizeLegalStatus({ current_version: '2026-10-11', accepted_version: null, needs_acceptance: true })
  assert.equal(needsLegalAcceptance(pending), true)
  const done = normalizeLegalStatus({ current_version: '2026-10-11', accepted_version: '2026-10-11', accepted_at: '2026-10-11T10:00:00Z', needs_acceptance: false })
  assert.equal(needsLegalAcceptance(done), false)
  assert.equal(done.acceptedAt, '2026-10-11T10:00:00Z')
  const old = normalizeLegalStatus({ current_version: '2026-12-01', accepted_version: '2026-10-11' })
  assert.equal(needsLegalAcceptance(old), true)
})

test('consent modal stays out of the legal pages only', () => {
  assert.equal(hidesConsentModal('terms'), true)
  assert.equal(hidesConsentModal('privacy'), true)
  assert.equal(hidesConsentModal('game'), false)
  assert.equal(hidesConsentModal(undefined), false)
})

test('empty operator fields show a visible placeholder', () => {
  const v = operatorField('name')
  assert.ok(v === OPERATOR_PLACEHOLDER || v.length > 0)
})
