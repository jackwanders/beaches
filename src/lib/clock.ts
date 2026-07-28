import type { ClockState } from '../types'

/** Device local time, used directly — TCI is UTC−4 and so is US Eastern in August. */
export function minutesOfDay(t: Date): number {
  return t.getHours() * 60 + t.getMinutes()
}

export const MINUTES_PER_DAY = 1440

/**
 * Meal inference, half-open intervals `[start, end)`:
 *
 *   06:00 breakfast · 11:00 lunch · 15:30 gap · 17:00 dinner · 21:30 lateNight
 *
 * lateNight runs through 02:00. The spec leaves 02:00–06:00 undefined; it maps
 * to breakfast so the never-zero rule surfaces "Schooners opens at 7:30"
 * rather than an empty late-night list.
 */
export function clockState(t: Date): ClockState {
  const m = minutesOfDay(t)
  if (m >= 1290 || m < 120) return 'lateNight' // 21:30 → 02:00
  if (m < 660) return 'breakfast' // 02:00 → 11:00
  if (m < 930) return 'lunch' // 11:00 → 15:30
  if (m < 1020) return 'gap' // 15:30 → 17:00
  return 'dinner' // 17:00 → 21:30
}

/** Minutes-from-midnight to "6:30 PM". */
export function formatTime(minutes: number): string {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h24 = Math.floor(m / 60)
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const mm = String(m % 60).padStart(2, '0')
  return `${h12}:${mm} ${h24 < 12 ? 'AM' : 'PM'}`
}
