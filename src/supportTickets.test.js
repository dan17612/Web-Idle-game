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
