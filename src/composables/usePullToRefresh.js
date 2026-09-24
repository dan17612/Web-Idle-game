import { onMounted, onUnmounted, ref } from 'vue'

// Pull-to-Refresh für Touch-Geräte (v. a. iPhone, wo es – anders als bei
// Android/Chrome – kein natives „runterziehen zum Neuladen" gibt).
// Erkennt eine Zieh-Geste nach unten, während die Seite ganz oben steht,
// und löst ab einem Schwellwert onRefresh() aus.
//
// iOS-Safari-Besonderheit: Beim Overscroll am oberen Rand übernimmt Safari
// die Geste oft selbst (Rubber-Band) und feuert dann touchcancel. Damit der
// Reload trotzdem auslöst, merken wir uns den größten erreichten Zug (peak)
// und werten touchcancel genauso aus wie touchend.
//
// options:
//   onRefresh: () => void  – wird beim Loslassen über dem Schwellwert aufgerufen
//   enabled: () => boolean – Geste nur aktiv, wenn true (z. B. eingeloggt)
// Gesten in Vollbild-Spielen, Modals und Touch-Flächen (Joystick, Spielfeld)
// dürfen nie ein Neuladen auslösen: Die Seite darunter steht oft ganz oben,
// ein Wisch nach unten im Spiel sähe sonst wie „runterziehen" aus.
// Blockiert, sobald das Ziel oder ein Vorfahr touch-action: none hat, fixiert
// positioniert ist (Overlay/Modal) oder data-no-pull-refresh trägt.
export function blocksPullToRefresh(el, getStyle = (n) => getComputedStyle(n)) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    if (n.hasAttribute && n.hasAttribute('data-no-pull-refresh')) return true
    if (n.tagName === 'BODY' || n.tagName === 'HTML') return false
    const s = getStyle(n)
    if (!s) continue
    if (s.touchAction === 'none' || s.position === 'fixed') return true
  }
  return false
}

export function usePullToRefresh({ onRefresh, enabled } = {}) {
  const THRESHOLD = 64 // px (gedämpft), ab hier wird ausgelöst
  const MAX = 110 // px, gedämpftes Maximum für den Indikator
  const RESISTANCE = 0.5 // Zieh-Widerstand (halbe Fingerbewegung)

  const pullDistance = ref(0)
  const refreshing = ref(false)

  let startY = 0
  let active = false // gerade in einer gültigen Pull-Geste?
  let peak = 0 // größter erreichter (gedämpfter) Zug in dieser Geste

  const scrollTop = () =>
    window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0
  const atTop = () => scrollTop() <= 1

  function reset() {
    active = false
    peak = 0
    pullDistance.value = 0
  }

  function onTouchStart(e) {
    if (refreshing.value) return
    if (enabled && !enabled()) { active = false; return }
    if (e.touches.length !== 1) { active = false; return }
    if (blocksPullToRefresh(e.target)) { active = false; return }
    // Nur starten, wenn wir ganz oben stehen.
    if (!atTop()) { active = false; return }
    startY = e.touches[0].clientY
    peak = 0
    active = true
  }

  function onTouchMove(e) {
    if (!active || refreshing.value) return
    const dy = e.touches[0].clientY - startY
    // Nach oben gezogen oder inzwischen weggescrollt → Geste abbrechen,
    // normales Scrollen nicht stören.
    if (dy <= 0 || !atTop()) {
      if (pullDistance.value !== 0) pullDistance.value = 0
      active = false
      peak = 0
      return
    }
    // Rubber-Band/native Overscroll unterdrücken, damit Safari die Geste
    // nicht selbst übernimmt (sonst touchcancel + kein sauberes Ziehen).
    if (e.cancelable) e.preventDefault()
    const d = Math.min(MAX, dy * RESISTANCE)
    pullDistance.value = d
    if (d > peak) peak = d
  }

  function finish() {
    // Auslösen, sobald der Zug den Schwellwert erreicht hat – auch wenn Safari
    // die Geste per touchcancel vorzeitig beendet hat (peak statt aktuellem Wert).
    if (active && !refreshing.value && peak >= THRESHOLD) {
      active = false
      refreshing.value = true
      pullDistance.value = THRESHOLD
      // refreshing bleibt an, bis der (i. d. R.) folgende Reload die Seite ersetzt.
      try { onRefresh && onRefresh() } catch { refreshing.value = false; reset() }
    } else {
      reset()
    }
  }

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', finish, { passive: true })
    document.addEventListener('touchcancel', finish, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', finish)
    document.removeEventListener('touchcancel', finish)
  })

  return { pullDistance, refreshing, threshold: THRESHOLD }
}
