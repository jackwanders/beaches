import type { ClockState } from '../types'
import { MEAL_WINDOWS, MINUTES_PER_DAY, minutesOfDay } from './clock'

/**
 * The rail spans the dining day, not the calendar day: 06:00 to 02:00 the next
 * morning. The earliest service opens at 06:00 and the last one closes at
 * 02:00, so 02:00–06:00 is dead space that would eat a sixth of the bar on a
 * phone. It is off the rail entirely.
 */
export const RAIL_START = 360
export const RAIL_END = 1560
export const RAIL_SPAN = RAIL_END - RAIL_START

export type RailSegment = {
  state: ClockState
  start: number
  end: number
  leftPercent: number
  widthPercent: number
  /** Fraction of this window already elapsed: 1 past, 0 future, partial now. */
  fill: number
}

export type RailGeometry = {
  segments: RailSegment[]
  markerPercent: number
  activeIndex: number
  /** True in the 02:00–06:00 dead zone, where the marker pins to the left edge. */
  clamped: boolean
}

/**
 * Minutes-from-midnight onto the rail's axis. After midnight maps forward by a
 * day so late night lands at the right-hand end; the dead zone returns null.
 */
export function extendedMinutes(m: number): number | null {
  if (m >= RAIL_START) return m
  if (m < 120) return m + MINUTES_PER_DAY
  return null
}

/** Two decimal places, so React doesn't churn on `12.500000001%`. */
function percentAt(minutes: number): number {
  return Math.round(((minutes - RAIL_START) / RAIL_SPAN) * 10000) / 100
}

export function railGeometry(t: Date): RailGeometry {
  const extended = extendedMinutes(minutesOfDay(t))
  const clamped = extended === null
  // In the dead zone everything reads as "breakfast hasn't started": the marker
  // sits at the left edge and no window has begun to fill. This matches
  // clockState, which maps 02:00–06:00 to breakfast.
  const at = extended ?? RAIL_START

  let activeIndex = 0
  const segments = MEAL_WINDOWS.map((w, i) => {
    if (at >= w.start && at < w.end) activeIndex = i
    const span = w.end - w.start
    const elapsed = Math.min(Math.max(at - w.start, 0), span)
    return {
      state: w.state,
      start: w.start,
      end: w.end,
      leftPercent: percentAt(w.start),
      // Derived from the boundaries rather than the span, so contiguous
      // segments always sum to exactly 100.
      widthPercent: percentAt(w.end) - percentAt(w.start),
      fill: elapsed / span,
    }
  })

  return {
    segments,
    markerPercent: clamped ? 0 : percentAt(at),
    activeIndex,
    clamped,
  }
}
