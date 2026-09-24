import test from 'node:test'
import assert from 'node:assert/strict'
import { blocksPullToRefresh } from './composables/usePullToRefresh.js'

// Minimaler DOM-Ersatz: Knoten mit tagName, parentElement, Attributen und Stil.
function node(tagName, style = {}, parent = null, attrs = {}) {
  return {
    nodeType: 1,
    tagName,
    parentElement: parent,
    style,
    hasAttribute: (k) => k in attrs
  }
}
const getStyle = (n) => n.style
const html = node('HTML')
const body = node('BODY', {}, html)

test('normaler Seiteninhalt darf neu laden', () => {
  const main = node('MAIN', { touchAction: 'auto', position: 'static' }, body)
  const card = node('DIV', { touchAction: 'auto', position: 'relative' }, main)
  assert.equal(blocksPullToRefresh(card, getStyle), false)
})

test('Spielfeld im Vollbild-Overlay blockiert', () => {
  const overlay = node('DIV', { touchAction: 'none', position: 'fixed' }, body)
  const board = node('CANVAS', { touchAction: 'auto', position: 'static' }, overlay)
  assert.equal(blocksPullToRefresh(board, getStyle), true)
})

test('Modal (fixed) blockiert auch ohne touch-action', () => {
  const modal = node('DIV', { touchAction: 'auto', position: 'fixed' }, body)
  const btn = node('BUTTON', { touchAction: 'manipulation', position: 'static' }, modal)
  assert.equal(blocksPullToRefresh(btn, getStyle), true)
})

test('data-no-pull-refresh blockiert', () => {
  const area = node('DIV', {}, body, { 'data-no-pull-refresh': '' })
  assert.equal(blocksPullToRefresh(node('SPAN', {}, area), getStyle), true)
})

test('kein Ziel ⇒ nicht blockiert', () => {
  assert.equal(blocksPullToRefresh(null, getStyle), false)
})
