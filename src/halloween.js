// Halloween-Saison & Deko — reine Logik.
// DOM-Anbindung: src/composables/useHalloween.js, Deko-Ebene:
// src/components/HalloweenDecor.vue.
// Spec: docs/superpowers/specs/2026-10-08-halloween-update-design.md

export const HALLOWEEN_STORAGE_KEY = 'zoo.halloween'
// Klasse auf <html>; styles.css färbt darüber Glow & Akzente.
export const HALLOWEEN_CLASS = 'halloween'

// Saison 1. Oktober bis 8. November nach lokalem Datum — Halloween feiert man
// in der eigenen Zeitzone, und die Deko ist reine Kosmetik. Das Puzzle selbst
// hängt am Server-Zeitplan (halloween_puzzle).
export function isHalloweenSeason(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return false
  const month = d.getMonth()
  return month === 9 || (month === 10 && d.getDate() <= 8)
}

// Deko ist Standard; abschalten lässt sie sich in den Einstellungen.
export function normalizeHalloweenPref(value) {
  return value === 'off' ? 'off' : 'on'
}

export function halloweenDecorActive(pref, date = new Date()) {
  return normalizeHalloweenPref(pref) === 'on' && isHalloweenSeason(date)
}

// Die schwebende Deko-Ebene. Vorgabe vom Spieler: deutlich mehr Kürbisse als
// Skelette — src/halloween.test.js hält das Verhältnis fest.
//   fly   = quer über den Bildschirm (Fledermäuse, Geist)
//   fall  = von oben nach unten (Laub)
//   side  = sitzt am linken/rechten Rand (nur auf breiten Bildschirmen)
// top/left/bottom/x in Prozent bzw. vw, size in px, dur/delay in Sekunden.
export const DECOR_ITEMS = [
  { kind: 'bat', e: '🦇', mode: 'fly', top: 16, size: 22, dur: 19, delay: 2 },
  { kind: 'bat', e: '🦇', mode: 'fly', top: 38, size: 16, dur: 23, delay: 11 },
  { kind: 'bat', e: '🦇', mode: 'fly', top: 62, size: 19, dur: 29, delay: 18 },
  { kind: 'ghost', e: '👻', mode: 'fly', top: 50, size: 26, dur: 41, delay: 24, reverse: true },
  { kind: 'leaf', e: '🍂', mode: 'fall', left: 9, size: 18, dur: 17, delay: 0 },
  { kind: 'leaf', e: '🍁', mode: 'fall', left: 36, size: 15, dur: 22, delay: 8 },
  { kind: 'leaf', e: '🍂', mode: 'fall', left: 68, size: 17, dur: 19, delay: 13 },
  { kind: 'leaf', e: '🍁', mode: 'fall', left: 91, size: 14, dur: 25, delay: 5 },
  { kind: 'pumpkin', e: '🎃', mode: 'side', side: 'left', x: 3, bottom: 3, size: 54 },
  { kind: 'pumpkin', e: '🎃', mode: 'side', side: 'left', x: 10, bottom: 2, size: 32 },
  { kind: 'skull', e: '💀', mode: 'side', side: 'left', x: 15, bottom: 2, size: 22 },
  { kind: 'pumpkin', e: '🎃', mode: 'side', side: 'right', x: 3, bottom: 2, size: 60 },
  { kind: 'pumpkin', e: '🎃', mode: 'side', side: 'right', x: 11, bottom: 2, size: 36 },
  { kind: 'pumpkin', e: '🎃', mode: 'side', side: 'right', x: 16, bottom: 9, size: 24 },
  { kind: 'candy', e: '🍬', mode: 'side', side: 'right', x: 20, bottom: 2, size: 20 }
]

export function countDecor(items, kind) {
  return items.filter((item) => item.kind === kind).length
}
