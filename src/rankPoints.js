// Punkte je Platzierung für die Gesamt-Rangliste.
//
// Spiegel der SQL-Funktion public._rank_points(int). Beide Seiten müssen
// identisch rechnen — src/rankPointsSql.test.js vergleicht sie Platz für Platz.
// Bei Balance-Änderungen immer beide ändern.

export function rankPoints(rank) {
  const r = Math.floor(Number(rank) || 0)
  if (r < 1 || r > 100) return 0
  if (r === 1) return 100
  if (r === 2) return 80
  if (r === 3) return 65
  if (r <= 10) return 60 - (r - 4) * 6
  if (r <= 25) return 20 - (r - 11)
  if (r <= 50) return 5
  return 2
}

// Reihenfolge bestimmt, wie die Aufschlüsselung hinter dem ⓘ sortiert ist,
// wenn zwei Disziplinen gleich viele Punkte bringen.
export const DISCIPLINES = [
  'rate', 'coins', 'boss_path', 'boss_endless',
  'memory', 'merge', 'wordle', 'drift', 'parkour'
]

export function totalPoints(disciplines) {
  if (!Array.isArray(disciplines)) return 0
  return disciplines.reduce((sum, d) => sum + (Number(d?.points) || 0), 0)
}
