import { CONFIG } from '../config'

export type Mode = 'now' | 'explore'

/**
 * Which mode the app opens in.
 *
 * Before the trip you are reading about the resort, not deciding where to walk
 * in ten minutes — the time rail and the three-card surface are answering a
 * question nobody is asking yet. During the trip the clock is everything.
 * After it, the app is a souvenir. One tap overrides either way.
 */
export function defaultMode(t: Date): Mode {
  const start = new Date(`${CONFIG.TRIP_START}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + CONFIG.TRIP_NIGHTS)
  return t >= start && t < end ? 'now' : 'explore'
}
