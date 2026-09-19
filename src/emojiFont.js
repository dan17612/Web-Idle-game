// Emoji-Fallback-Kette für Canvas-Kontexte.
//
// Im DOM ergänzt der Browser fehlende Emoji-Glyphen automatisch. Im Canvas ist
// dieser Fallback auf Windows löchrig: `serif` löst zu Times New Roman auf, und
// für Sequenzen aus mehreren Codepoints greift dann das Shaping nicht mehr —
// die Sequenz zerfällt sichtbar in ihre Bestandteile. Jede Stelle, die Emoji in
// ein Canvas zeichnet, muss die Kette deshalb explizit mitgeben.

export const EMOJI_FONT =
  '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif'

export function emojiFontSpec(px, options = {}) {
  const size = Math.max(1, Math.round(Number(px) || 0))
  const { weight, family } = options
  const stack = family ? `${family}, ${EMOJI_FONT}` : EMOJI_FONT
  return `${weight ? `${weight} ` : ''}${size}px ${stack}`
}

// Emoji aus mehr als einem Codepoint (ZWJ-Sequenzen wie 🐦‍🔥, Variantenselektor
// wie ❤️). Im DOM unproblematisch, in Canvas-Pfaden der häufigste Fehlerfall.
const SEQUENCE_RE =
  /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}]|⃣)+/gu

export function findEmojiSequences(text) {
  return String(text || '').match(SEQUENCE_RE) || []
}

export function hasEmojiSequence(text) {
  return findEmojiSequences(text).length > 0
}
