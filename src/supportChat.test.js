import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTicketSubject, canSendMessage, sortConversations, pickActiveTicketId,
  SUPPORT_MESSAGE_MAX, replyAuthor
} from './supportChat.js'

test('subject is category plus the first non-empty line', () => {
  assert.equal(buildTicketSubject('🐞 Bug', '\n  Truhe öffnet nicht \nmehr Text'), '🐞 Bug: Truhe öffnet nicht')
  assert.equal(buildTicketSubject('', 'Nur eine Frage'), 'Nur eine Frage')
  assert.equal(buildTicketSubject('❓ Frage', '   '), '❓ Frage')
  assert.equal(buildTicketSubject('', ''), 'Support')
})

test('subject is shortened with an ellipsis', () => {
  const s = buildTicketSubject('💡 Feedback', 'x'.repeat(200), 30)
  assert.equal(s.length, 30)
  assert.ok(s.endsWith('…'))
  assert.ok(s.startsWith('💡 Feedback: '))
})

test('canSendMessage needs text within the server limit', () => {
  assert.equal(canSendMessage('hi'), true)
  assert.equal(canSendMessage('   '), false)
  assert.equal(canSendMessage(null), false)
  assert.equal(canSendMessage('a'.repeat(SUPPORT_MESSAGE_MAX)), true)
  assert.equal(canSendMessage('a'.repeat(SUPPORT_MESSAGE_MAX + 1)), false)
})

const tickets = [
  { id: 'old-closed', status: 'closed', created_at: '2026-09-01T10:00:00Z' },
  { id: 'open-old', status: 'open', created_at: '2026-09-02T10:00:00Z' },
  { id: 'replied-new', status: 'replied', created_at: '2026-09-03T10:00:00Z', replied_at: '2026-09-20T10:00:00Z' },
  { id: 'closed-new', status: 'closed', created_at: '2026-09-25T10:00:00Z' }
]

test('open conversations come first, newest activity first', () => {
  assert.deepEqual(sortConversations(tickets).map((t) => t.id), ['replied-new', 'open-old', 'closed-new', 'old-closed'])
  assert.deepEqual(sortConversations(null), [])
})

test('the newest open conversation is active, otherwise a new one', () => {
  assert.equal(pickActiveTicketId(tickets), 'replied-new')
  assert.equal(pickActiveTicketId(tickets.filter((t) => t.status === 'closed')), null)
  assert.equal(pickActiveTicketId([]), null)
})

test('replyAuthor names the admin who answered', () => {
  assert.equal(replyAuthor({ sender: 'user', body: 'x' }), null)
  assert.deepEqual(replyAuthor({ sender: 'admin', sender_name: 'Daniil', sender_role: 'admin' }), { name: 'Daniil', role: 'admin', icon: '🛠️' })
  assert.deepEqual(replyAuthor({ sender: 'admin', sender_name: ' Musti ', sender_role: 'subadmin' }), { name: 'Musti', role: 'subadmin', icon: '🛡️' })
  assert.deepEqual(replyAuthor({ sender: 'admin' }), { name: null, role: 'admin', icon: '🛠️' })
})
