import type { ClockState } from '../types'

/** Device local time, used directly — TCI is UTC−4 and so is US Eastern in August. */
export function minutesOfDay(t: Date): number {
  return t.getHours() * 60 + t.getMinutes()
}

export const MINUTES_PER_DAY = 1440

/**
 * The dining day, half-open intervals `[start, end)`. `lateNight` runs past
 * midnight, so its end is expressed in *extended* minutes — 1560 is 02:00 the
 * next morning.
 *
 * Both `clockState` and the time rail read this one table, so they cannot
 * disagree about where a meal ends. Editing a boundary here moves the rail and
 * the recommendation query together.
 */
export const MEAL_WINDOWS = [
  { state: 'breakfast', start: 360, end: 660 }, // 06:00 → 11:00
  { state: 'lunch', start: 660, end: 930 }, // 11:00 → 15:30
  { state: 'gap', start: 930, end: 1020 }, // 15:30 → 17:00
  { state: 'dinner', start: 1020, end: 1290 }, // 17:00 → 21:30
  { state: 'lateNight', start: 1290, end: 1560 }, // 21:30 → 02:00 (+1 day)
] as const satisfies readonly { state: ClockState; start: number; end: number }[]

export function clockState(t: Date): ClockState {
  const m = minutesOfDay(t)
  // Before 02:00 belongs to the previous evening's late night.
  const extended = m < 120 ? m + MINUTES_PER_DAY : m
  const window = MEAL_WINDOWS.find((w) => extended >= w.start && extended < w.end)
  // 02:00–06:00 falls through every window. The spec leaves it undefined; it
  // maps to breakfast so the never-zero rule surfaces "Schooners opens at 7:30"
  // rather than an empty late-night list.
  return window?.state ?? 'breakfast'
}

/** Minutes-from-midnight to "6:30 PM". */
export function formatTime(minutes: number): string {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h24 = Math.floor(m / 60)
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const mm = String(m % 60).padStart(2, '0')
  return `${h12}:${mm} ${h24 < 12 ? 'AM' : 'PM'}`
}
