// Regelwerk (Nutzungsbedingungen + Datenschutz) und Pflicht-Zustimmung.
// Server: supabase/migrations/20261011_regelwerk.sql
// Spec: docs/superpowers/specs/2026-10-11-regelwerk-zustimmung-design.md

// Spiegel von public._legal_current_version() (src/legalSql.test.js).
// Bei wesentlichen Textänderungen erhöhen: Alle Spieler stimmen dann neu zu.
export const LEGAL_VERSION = '2026-10-11'

// Angaben zum Betreiber für Datenschutz und Nutzungsbedingungen.
// Leere Felder erscheinen in den Texten als „[wird ergänzt]“.
export const OPERATOR = Object.freeze({
  name: '',
  address: '',
  email: ''
})

export const OPERATOR_PLACEHOLDER = '[wird ergänzt]'

export function operatorField(key) {
  const value = String(OPERATOR[key] ?? '').trim()
  return value || OPERATOR_PLACEHOLDER
}

// Formatiert die Version (YYYY-MM-DD) als deutsches Datum.
export function formatLegalVersion(version = LEGAL_VERSION) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(version || ''))
  return m ? `${m[3]}.${m[2]}.${m[1]}` : String(version || '')
}

// Normalisiert die Antwort von legal_status()/legal_accept().
// null = keine Angabe (RPC fehlt oder Fehler) ⇒ keine Pflicht anzeigen.
export function normalizeLegalStatus(data) {
  if (!data || typeof data !== 'object') return null
  const current = String(data.current_version || '')
  if (!current) return null
  const accepted = data.accepted_version ? String(data.accepted_version) : null
  return {
    currentVersion: current,
    acceptedVersion: accepted,
    acceptedAt: data.accepted_at || null,
    needsAcceptance: data.needs_acceptance == null ? accepted !== current : Boolean(data.needs_acceptance)
  }
}

export function needsLegalAcceptance(status) {
  return Boolean(status && status.needsAcceptance)
}

// Auf diesen Seiten wird das Pflicht-Fenster ausgeblendet, damit man die Texte lesen kann.
export const LEGAL_ROUTES = Object.freeze(['terms', 'privacy'])

export function hidesConsentModal(routeName) {
  return LEGAL_ROUTES.includes(String(routeName || ''))
}
