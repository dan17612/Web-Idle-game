import { ref } from 'vue'

const MS_PER_DAY = 86400000

/**
 * Checks the daily login streak stored in localStorage and returns whether
 * today is a new login day.  Returns the current streak count and a flag
 * indicating a fresh login (so the caller can show a reward toast once).
 */
export function useLoginStreak(userId) {
  const streak = ref(0)
  const isNewDay = ref(false)

  if (!userId) return { streak, isNewDay }

  const keyStreak = `loginStreak:${userId}`
  const keyLast = `loginStreakLast:${userId}`

  try {
    const now = Date.now()
    const today = Math.floor(now / MS_PER_DAY)
    const lastRaw = localStorage.getItem(keyLast)
    const lastDay = lastRaw ? parseInt(lastRaw, 10) : null
    const storedStreak = parseInt(localStorage.getItem(keyStreak) || '0', 10)

    if (lastDay === today) {
      // Already logged in today – just restore streak
      streak.value = storedStreak
      isNewDay.value = false
    } else if (lastDay === today - 1) {
      // Consecutive day – extend streak
      const next = storedStreak + 1
      streak.value = next
      isNewDay.value = true
      localStorage.setItem(keyStreak, String(next))
      localStorage.setItem(keyLast, String(today))
    } else {
      // Gap or first ever login – reset to 1
      streak.value = 1
      isNewDay.value = lastDay !== null // false on very first login
      localStorage.setItem(keyStreak, '1')
      localStorage.setItem(keyLast, String(today))
    }
  } catch {
    streak.value = 1
    isNewDay.value = false
  }

  return { streak, isNewDay }
}
