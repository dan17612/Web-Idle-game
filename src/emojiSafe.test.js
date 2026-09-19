// Schützt die Canvas-Pfade vor Emoji, die auf Windows zerfallen.
//
// Hintergrund: worldEngine und DriftGameView zeichnen Emoji in Texturen. Dort
// ist der Font-Fallback auf Windows löchrig, und Emoji aus mehreren Codepoints
// (ZWJ-Sequenzen, Variantenselektor) werden dann als mehrere Glyphen gerendert.
//
// Im DOM ist beides unproblematisch. Der Test prüft deshalb gezielt nur die
// Zeichenketten, die wirklich auf ein Canvas gehen — nicht ganze Dateien, sonst
// würde er die Emoji in Überschriften und Templates mitfangen.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { findEmojiSequences } from './emojiFont.js'

function read(file) {
  return readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
}

// world.js und worldEngine.js sind Engine plus Engine-Daten: Jedes Emoji darin
// wird als Sprite gezeichnet, deshalb zählt hier die ganze Datei.
const FULL_FILES = ['src/world.js', 'src/worldEngine.js']

// In DriftGameView zeichnet nur ctx.fillText, alles andere ist Template.
const CANVAS_LITERALS = {
  'src/views/DriftGameView.vue': [
    /\bctx\.fillText\(\s*(['"`])((?:(?!\1).)*)\1/g,
    /const emojis\s*=\s*\[([^\]]*)\]/g
  ]
}

const ALL_FILES = [...FULL_FILES, ...Object.keys(CANVAS_LITERALS)]

test('Emoji auf Canvas-Sprites bestehen aus genau einem Codepoint', () => {
  for (const file of FULL_FILES) {
    const found = findEmojiSequences(read(file))
    assert.deepEqual(
      found, [],
      `${file} enthaelt Emoji-Sequenzen, die im Canvas zerfallen: ${found.join(' ')}`
    )
  }

  for (const [file, patterns] of Object.entries(CANVAS_LITERALS)) {
    const src = read(file)
    for (const pattern of patterns) {
      for (const match of src.matchAll(pattern)) {
        const literal = match[2] ?? match[1]
        const found = findEmojiSequences(literal)
        assert.deepEqual(
          found, [],
          `${file} zeichnet eine Emoji-Sequenz auf Canvas: ${found.join(' ')} in ${match[0].trim()}`
        )
      }
    }
  }
})

test('jedes ctx.font in Canvas-Dateien geht ueber emojiFontSpec', () => {
  for (const file of ALL_FILES) {
    const src = read(file)
    const assignments = src.match(/\bctx2?\.font\s*=\s*[^\n]+/g) || []
    for (const line of assignments) {
      assert.match(
        line, /emojiFontSpec\(|=\s*font\b/,
        `${file}: ctx.font ohne Emoji-Fallback-Kette -> ${line.trim()}`
      )
    }
  }
})

test('keine Roh-Fontkette ohne Emoji-Fallback', () => {
  for (const file of ALL_FILES) {
    assert.doesNotMatch(
      read(file), /\.font\s*=\s*[`'"][^`'"]*\b(serif|sans-serif)\b[^`'"]*[`'"]/,
      `${file} setzt ctx.font auf eine Fontkette ohne Emoji-Fallback`
    )
  }
})

test('worldEngine und DriftGameView importieren emojiFontSpec', () => {
  for (const file of ['src/worldEngine.js', 'src/views/DriftGameView.vue']) {
    assert.match(
      read(file), /import \{ emojiFontSpec \} from '\.\.?\/emojiFont(\.js)?'/,
      `${file} importiert emojiFontSpec nicht`
    )
  }
})
