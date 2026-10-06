// Autoklicker-Erkennung (Client-Teil). Server-Seite + Regeln:
// supabase/migrations/20261006_autoklicker_erkennung.sql,
// Spec: docs/superpowers/specs/2026-10-06-autoklicker-erkennung-design.md

// Nur die Klick-Schwellen, die der Sampler im Browser braucht. Spiegel der
// gleichnamigen Schlüssel in public._automation_rules() (src/automationSql.test.js).
// Die übrigen Regeln (Dauerlauf, Takt, Meldungen) bleiben bewusst nur auf dem
// Server, damit sie nicht im ausgelieferten Bundle stehen.
export const CLICK_RULES = Object.freeze({
  click_window: 30,
  click_max_spread_px: 1.5,
  click_min_sd_ms: 8,
  click_rel_sd: 0.04,
  click_max_gap_ms: 5000,
  click_report_cooldown_s: 60
})

export const CODE_LENGTH = 4
const DEFAULT_MAX_ATTEMPTS = 5

// Fehler aus den Tracking-Triggern, solange eine Prüfung offen ist.
export function isAutomationLockError(err) {
  const msg = typeof err === 'string' ? err : err?.message
  return /automation_check_required/.test(String(msg || ''))
}

// Nur Ziffern, höchstens 4 — Eingabefeld und Server nutzen dieselbe Regel.
export function sanitizeCode(input) {
  return String(input ?? '').replace(/\D/g, '').slice(0, CODE_LENGTH)
}

// Normalisiert die Antwort von automation_status()/automation_verify().
// Der Server verrät bewusst nicht, welches Muster erkannt wurde.
export function normalizeAutomationStatus(data) {
  if (!data || !data.pending) return null
  return {
    id: data.id ?? null,
    code: sanitizeCode(data.code),
    ticketNumber: data.ticket_number || null,
    attempts: Math.max(0, Number(data.attempts) || 0),
    maxAttempts: Math.max(1, Number(data.max_attempts) || DEFAULT_MAX_ATTEMPTS),
    createdAt: data.created_at || null
  }
}

function mean(values) {
  return values.reduce((s, v) => s + v, 0) / values.length
}

function stddev(values) {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

// Bewertet eine Klickserie ({ t, x, y }[], t in ms). Auffällig ist nur, was ein
// Mensch nicht schafft: gleiche Stelle UND gleichmäßiger Rhythmus über die
// ganze Serie. Eine ruhende Maus allein reicht nicht (Rhythmus streut).
export function analyzeClicks(samples, rules = CLICK_RULES) {
  const list = Array.isArray(samples) ? samples : []
  if (list.length < rules.click_window) return null
  const win = list.slice(-rules.click_window)
  const gaps = []
  for (let i = 1; i < win.length; i++) gaps.push(win[i].t - win[i - 1].t)
  if (gaps.some((g) => !(g > 0) || g > rules.click_max_gap_ms)) return null

  const xs = win.map((s) => s.x)
  const ys = win.map((s) => s.y)
  const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
  const meanMs = mean(gaps)
  const sdMs = stddev(gaps)
  const sdLimit = Math.max(rules.click_min_sd_ms, rules.click_rel_sd * meanMs)
  const suspicious = spread <= rules.click_max_spread_px && sdMs <= sdLimit

  return {
    suspicious,
    n: win.length,
    mean_ms: Math.round(meanMs * 10) / 10,
    sd_ms: Math.round(sdMs * 100) / 100,
    spread_px: Math.round(spread * 100) / 100
  }
}

// Sammelt pointerdown-Ereignisse und meldet ein auffälliges Muster höchstens
// einmal pro Cooldown. Nach einer Meldung beginnt die Serie von vorn.
export function createClickSampler({ onPattern, now = () => Date.now(), rules = CLICK_RULES } = {}) {
  let samples = []
  let lastReport = -Infinity

  function record(evt) {
    const t = Number(evt?.t ?? evt?.timeStamp)
    const x = Number(evt?.x ?? evt?.clientX)
    const y = Number(evt?.y ?? evt?.clientY)
    if (!Number.isFinite(t) || !Number.isFinite(x) || !Number.isFinite(y)) return null
    const prev = samples[samples.length - 1]
    if (prev && (t <= prev.t || t - prev.t > rules.click_max_gap_ms)) samples = []
    samples.push({ t, x, y })
    if (samples.length > rules.click_window) samples.shift()

    const result = analyzeClicks(samples, rules)
    if (!result || !result.suspicious) return result
    const at = now()
    if (at - lastReport < rules.click_report_cooldown_s * 1000) return result
    lastReport = at
    samples = []
    if (typeof onPattern === 'function') onPattern(result)
    return result
  }

  function reset() {
    samples = []
  }

  return { record, reset, size: () => samples.length }
}
