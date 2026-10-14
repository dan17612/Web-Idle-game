// Zuletzt gewählte Truhen-Menge pro Shop im Browser merken (nur Komfort,
// localStorage kann fehlen oder werfen — dann gilt einfach 1).

export const CHEST_QTY_OPTIONS = [1, 2, 5]
export const CHEST_QTY_KEYS = { shop: 'chestQty:shop', tickets: 'chestQty:tickets' }

export function normalizeChestQty(value) {
  const n = Number(value)
  return CHEST_QTY_OPTIONS.includes(n) ? n : 1
}

export function loadChestQty(key) {
  try {
    return normalizeChestQty(globalThis.localStorage?.getItem(key))
  } catch {
    return 1
  }
}

export function saveChestQty(key, qty) {
  try {
    globalThis.localStorage?.setItem(key, String(normalizeChestQty(qty)))
  } catch {}
}
