import test from 'node:test'
import assert from 'node:assert/strict'
import { qualifySupportTickets, hasUnseenReply, buildSeenMap } from './supportTickets.js'

const NOW = Date.parse('2026-05-19T12:00:00Z')
const hoursAgo = (h) => new Date(NOW - h * 3600_000).toISOString()

test('qualifySupportTickets keeps open and replied tickets', () => {
  const tickets = [
    { id: 'a', status: 'open', closed_at: null },
    { id: 'b', status: 'replied', closed_at: null }
  ]
  const out = qualifySupportTickets(tickets, NOW)
  assert.deepEqual(out.map((t) => t.id), ['a', 'b'])
})

test('qualifySupportTickets keeps closed ticket younger than 24h', () => {
  const tickets = [{ id: 'c', status: 'closed', closed_at: hoursAgo(23) }]
  assert.equal(qualifySupportTickets(tickets, NOW).length, 1)
})

test('qualifySupportTickets drops closed ticket older than 24h', () => {
  const tickets = [{ id: 'd', status: 'closed', closed_at: hoursAgo(25) }]
  assert.equal(qualifySupportTickets(tickets, NOW).length, 0)
})

test('qualifySupportTickets drops closed ticket without closed_at', () => {
  const tickets = [{ id: 'e', status: 'closed', closed_at: null }]
  assert.equal(qualifySupportTickets(tickets, NOW).length, 0)
})

test('hasUnseenReply true when replied ticket not in seen map', () => {
  const tickets = [{ id: 'a', status: 'replied', replied_at: hoursAgo(1), closed_at: null }]
  assert.equal(hasUnseenReply(tickets, {}, NOW), true)
})

test('hasUnseenReply false when replied_at already seen', () => {
  const r = hoursAgo(1)
  const tickets = [{ id: 'a', status: 'replied', replied_at: r, closed_at: null }]
  assert.equal(hasUnseenReply(tickets, { a: r }, NOW), false)
})

test('hasUnseenReply true when replied_at changed since seen', () => {
  const tickets = [{ id: 'a', status: 'replied', replied_at: hoursAgo(1), closed_at: null }]
  assert.equal(hasUnseenReply(tickets, { a: hoursAgo(5) }, NOW), true)
})

test('hasUnseenReply ignores non-qualified (old closed) replied tickets', () => {
  const tickets = [{ id: 'a', status: 'closed', replied_at: hoursAgo(30), closed_at: hoursAgo(25) }]
  assert.equal(hasUnseenReply(tickets, {}, NOW), false)
})

test('buildSeenMap records replied_at of qualified replied tickets', () => {
  const r = hoursAgo(1)
  const tickets = [
    { id: 'a', status: 'replied', replied_at: r, closed_at: null },
    { id: 'b', status: 'open', replied_at: null, closed_at: null }
  ]
  assert.deepEqual(buildSeenMap(tickets, { x: 'old' }, NOW), { x: 'old', a: r })
})

import { hasUnseenAdminMessage, buildAdminSeenMap, isUnansweredForDigest } from './supportTickets.js'

test('hasUnseenAdminMessage false when no last_user_message_at', () => {
  const t = [{ id: 'a', last_user_message_at: null }]
  assert.equal(hasUnseenAdminMessage(t, {}), false)
})

test('hasUnseenAdminMessage true when value not in seen map', () => {
  const t = [{ id: 'a', last_user_message_at: '2026-05-19T10:00:00Z' }]
  assert.equal(hasUnseenAdminMessage(t, {}), true)
})

test('hasUnseenAdminMessage false when value already seen', () => {
  const ts = '2026-05-19T10:00:00Z'
  const t = [{ id: 'a', last_user_message_at: ts }]
  assert.equal(hasUnseenAdminMessage(t, { a: ts }), false)
})

test('hasUnseenAdminMessage true when value changed since seen', () => {
  const t = [{ id: 'a', last_user_message_at: '2026-05-19T11:00:00Z' }]
  assert.equal(hasUnseenAdminMessage(t, { a: '2026-05-19T10:00:00Z' }), true)
})

test('buildAdminSeenMap records last_user_message_at, keeps foreign keys, skips empty', () => {
  const t = [
    { id: 'a', last_user_message_at: '2026-05-19T10:00:00Z' },
    { id: 'b', last_user_message_at: null }
  ]
  assert.deepEqual(buildAdminSeenMap(t, { x: 'old' }), { x: 'old', a: '2026-05-19T10:00:00Z' })
})

test('isUnansweredForDigest true: open, no reminder, last msg user older 24h', () => {
  const now = Date.parse('2026-05-19T12:00:00Z')
  const ticket = { status: 'open', reminder_sent_at: null }
  const latest = { sender: 'user', created_at: '2026-05-18T11:00:00Z' }
  assert.equal(isUnansweredForDigest(ticket, latest, now), true)
})

test('isUnansweredForDigest false when reminder already sent', () => {
  const now = Date.parse('2026-05-19T12:00:00Z')
  const ticket = { status: 'open', reminder_sent_at: '2026-05-19T00:00:00Z' }
  const latest = { sender: 'user', created_at: '2026-05-18T11:00:00Z' }
  assert.equal(isUnansweredForDigest(ticket, latest, now), false)
})

test('isUnansweredForDigest false when last message is admin', () => {
  const now = Date.parse('2026-05-19T12:00:00Z')
  const ticket = { status: 'open', reminder_sent_at: null }
  const latest = { sender: 'admin', created_at: '2026-05-18T11:00:00Z' }
  assert.equal(isUnansweredForDigest(ticket, latest, now), false)
})

test('isUnansweredForDigest false when last user message younger than 24h', () => {
  const now = Date.parse('2026-05-19T12:00:00Z')
  const ticket = { status: 'open', reminder_sent_at: null }
  const latest = { sender: 'user', created_at: '2026-05-19T06:00:00Z' }
  assert.equal(isUnansweredForDigest(ticket, latest, now), false)
})

test('isUnansweredForDigest false when status not open', () => {
  const now = Date.parse('2026-05-19T12:00:00Z')
  const ticket = { status: 'replied', reminder_sent_at: null }
  const latest = { sender: 'user', created_at: '2026-05-18T11:00:00Z' }
  assert.equal(isUnansweredForDigest(ticket, latest, now), false)
})
