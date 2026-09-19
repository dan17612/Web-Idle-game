import test from 'node:test'
import assert from 'node:assert/strict'
import { EMOJI_FONT, emojiFontSpec, findEmojiSequences, hasEmojiSequence } from './emojiFont.js'

test('EMOJI_FONT nennt Segoe UI Emoji zuerst und endet auf sans-serif', () => {
  assert.match(EMOJI_FONT, /^"Segoe UI Emoji"/)
  assert.match(EMOJI_FONT, /"Noto Color Emoji"/)
  assert.match(EMOJI_FONT, /sans-serif$/)
})

test('emojiFontSpec haengt die Kette immer an', () => {
  assert.equal(emojiFontSpec(48), `48px ${EMOJI_FONT}`)
  assert.ok(emojiFontSpec(12).endsWith(EMOJI_FONT))
  assert.ok(emojiFontSpec(96, { family: '"Baloo 2"' }).endsWith(EMOJI_FONT))
})

test('emojiFontSpec uebernimmt Gewicht und eigene Familie', () => {
  assert.equal(
    emojiFontSpec(30, { weight: 700, family: '"Baloo 2", "Nunito"' }),
    `700 30px "Baloo 2", "Nunito", ${EMOJI_FONT}`
  )
})

test('emojiFontSpec rundet und erzwingt eine positive Groesse', () => {
  assert.equal(emojiFontSpec(23.6), `24px ${EMOJI_FONT}`)
  assert.equal(emojiFontSpec(0), `1px ${EMOJI_FONT}`)
  assert.equal(emojiFontSpec(-5), `1px ${EMOJI_FONT}`)
  assert.equal(emojiFontSpec(undefined), `1px ${EMOJI_FONT}`)
})

test('findEmojiSequences erkennt ZWJ- und Variantenselektor-Sequenzen', () => {
  assert.deepEqual(findEmojiSequences('Phönix 🐦‍🔥 hier'), ['🐦‍🔥'])
  assert.deepEqual(findEmojiSequences('Herz ❤️ und Shop 🛍️'), ['❤️', '🛍️'])
  assert.deepEqual(findEmojiSequences('🧑‍🚀'), ['🧑‍🚀'])
})

test('findEmojiSequences laesst Einzel-Codepoint-Emoji in Ruhe', () => {
  assert.deepEqual(findEmojiSequences('🦅 🛒 💖 🪙 🪨 🦣 🐢 🌸'), [])
  assert.equal(hasEmojiSequence('nur Text ohne alles'), false)
  assert.equal(hasEmojiSequence('🦁 Mein Zoo'), false)
  assert.equal(hasEmojiSequence('🛍️ Shop'), true)
})
