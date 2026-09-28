import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ROADMAP_DEFAULT_FILTER, myVoteOf, ideaScore, nextVoteValue, applyVote,
  voteResultToFields, filterAndSortIdeas, formatScore
} from './roadmap.js'

test('default filter shows only ideas', () => {
  assert.equal(ROADMAP_DEFAULT_FILTER, 'idea')
})

test('myVoteOf reads my_value and falls back to legacy my_vote', () => {
  assert.equal(myVoteOf({ my_value: -1 }), -1)
  assert.equal(myVoteOf({ my_value: 1, my_vote: true }), 1)
  assert.equal(myVoteOf({ my_value: 0, my_vote: false }), 0)
  assert.equal(myVoteOf({ my_vote: true }), 1)
  assert.equal(myVoteOf(null), 0)
})

test('ideaScore is up minus down, legacy rows use vote_count', () => {
  assert.equal(ideaScore({ up_count: 5, down_count: 2, vote_count: 3 }), 3)
  assert.equal(ideaScore({ vote_count: 4 }), 4)
  assert.equal(ideaScore({ up_count: 0, down_count: 3 }), -3)
})

test('clicking the same arrow again withdraws the vote', () => {
  assert.equal(nextVoteValue(0, 1), 1)
  assert.equal(nextVoteValue(1, 1), 0)
  assert.equal(nextVoteValue(1, -1), -1)
  assert.equal(nextVoteValue(-1, -1), 0)
  assert.equal(nextVoteValue(-1, 1), 1)
})

test('applyVote moves a vote between up and down', () => {
  const idea = { up_count: 3, down_count: 1, my_value: 1 }
  assert.deepEqual(applyVote(idea, -1), { up_count: 2, down_count: 2, vote_count: 0, my_value: -1, my_vote: false })
  assert.deepEqual(applyVote(idea, 0), { up_count: 2, down_count: 1, vote_count: 1, my_value: 0, my_vote: false })
  const fresh = { up_count: 0, down_count: 0, my_value: 0 }
  assert.deepEqual(applyVote(fresh, 1), { up_count: 1, down_count: 0, vote_count: 1, my_value: 1, my_vote: true })
})

test('applyVote never goes below zero on stale rows', () => {
  const stale = { up_count: 0, down_count: 0, my_value: -1 }
  assert.deepEqual(applyVote(stale, 0), { up_count: 0, down_count: 0, vote_count: 0, my_value: 0, my_vote: false })
})

test('voteResultToFields maps the RPC answer', () => {
  assert.deepEqual(
    voteResultToFields({ up: 4, down: 2, score: 2, my_vote: -1, voted: false, count: 2 }),
    { up_count: 4, down_count: 2, vote_count: 2, my_value: -1, my_vote: false }
  )
  assert.deepEqual(voteResultToFields({}), { up_count: 0, down_count: 0, vote_count: 0, my_value: 0, my_vote: false })
})

test('filterAndSortIdeas filters by status and sorts by score or date', () => {
  const list = [
    { id: 'a', status: 'idea', up_count: 1, down_count: 0, created_at: '2026-01-01' },
    { id: 'b', status: 'idea', up_count: 5, down_count: 4, created_at: '2026-03-01' },
    { id: 'c', status: 'done', up_count: 9, down_count: 0, created_at: '2026-02-01' },
    { id: 'd', status: 'idea', up_count: 0, down_count: 2, created_at: '2026-04-01' }
  ]
  assert.deepEqual(filterAndSortIdeas(list, 'idea', 'votes').map((i) => i.id), ['b', 'a', 'd'])
  assert.deepEqual(filterAndSortIdeas(list, 'all', 'votes').map((i) => i.id), ['c', 'b', 'a', 'd'])
  assert.deepEqual(filterAndSortIdeas(list, 'all', 'recent').map((i) => i.id), ['d', 'b', 'c', 'a'])
  assert.deepEqual(filterAndSortIdeas(null), [])
})

test('formatScore caps large numbers', () => {
  assert.equal(formatScore(7), '7')
  assert.equal(formatScore(-3), '-3')
  assert.equal(formatScore(150), '99+')
  assert.equal(formatScore(-150), '-99')
  assert.equal(formatScore('x'), '0')
})
