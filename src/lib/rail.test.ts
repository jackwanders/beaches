import { describe, expect, test } from 'vitest'
import { clockState, MEAL_WINDOWS, MINUTES_PER_DAY } from './clock'
import { extendedMinutes, RAIL_END, RAIL_START, railGeometry } from './rail'

const at = (h: number, m = 0) => new Date(2026, 7, 17, h, m)
const atMinute = (m: number) => new Date(2026, 7, 17, Math.floor(m / 60), m % 60)

describe('segment table', () => {
  test('is contiguous and spans the whole rail', () => {
    expect(MEAL_WINDOWS[0].start).toBe(RAIL_START)
    expect(MEAL_WINDOWS[MEAL_WINDOWS.length - 1].end).toBe(RAIL_END)
    for (let i = 1; i < MEAL_WINDOWS.length; i++) {
      expect(MEAL_WINDOWS[i].start).toBe(MEAL_WINDOWS[i - 1].end)
    }
  })

  test('widths sum to exactly 100', () => {
    const { segments } = railGeometry(at(12))
    const total = segments.reduce((sum, s) => sum + s.widthPercent, 0)
    expect(total).toBe(100)
  })

  test('the gap is a visibly narrow pinch', () => {
    const { segments } = railGeometry(at(12))
    const gap = segments.find((s) => s.state === 'gap')!
    // 90 of 1200 minutes. The whole reason the rail is proportional: at
    // equal width it would look as long as dinner.
    expect(gap.widthPercent).toBe(7.5)
    expect(gap.leftPercent).toBe(47.5)
  })
})

describe('extendedMinutes', () => {
  test('maps the dining day onto the axis', () => {
    expect(extendedMinutes(360)).toBe(360) // 06:00, rail start
    expect(extendedMinutes(1439)).toBe(1439) // 23:59
    expect(extendedMinutes(0)).toBe(MINUTES_PER_DAY) // midnight → right end
    expect(extendedMinutes(119)).toBe(1559) // 01:59, last minute on the rail
  })

  test('drops the 02:00–06:00 dead zone', () => {
    expect(extendedMinutes(120)).toBeNull() // 02:00
    expect(extendedMinutes(359)).toBeNull() // 05:59
  })
})

describe('marker', () => {
  test('sits where the clock says', () => {
    expect(railGeometry(at(6)).markerPercent).toBe(0)
    expect(railGeometry(at(16)).markerPercent).toBe(50) // mid-gap
    expect(railGeometry(at(19)).markerPercent).toBe(65)
    expect(railGeometry(at(21, 30)).markerPercent).toBe(77.5)
    expect(railGeometry(at(0, 30)).markerPercent).toBe(92.5) // after midnight
  })

  test('pins to the left edge in the dead zone', () => {
    const g = railGeometry(at(4))
    expect(g.clamped).toBe(true)
    expect(g.markerPercent).toBe(0)
    expect(g.segments.every((s) => s.fill === 0)).toBe(true)
  })
})

describe('fill', () => {
  test('is spent / filling / empty across the rail', () => {
    const { segments } = railGeometry(at(16))
    const byState = Object.fromEntries(segments.map((s) => [s.state, s.fill]))
    expect(byState.breakfast).toBe(1)
    expect(byState.lunch).toBe(1)
    expect(byState.gap).toBeCloseTo(1 / 3) // 30 of 90 minutes in
    expect(byState.dinner).toBe(0)
    expect(byState.lateNight).toBe(0)
  })
})

test('the rail can never draw a different state than the query runs', () => {
  // The failure mode this guards against is the whole screen quietly lying:
  // the rail highlighting DINNER while candidates() is still filtering lunch.
  for (let m = 0; m < MINUTES_PER_DAY; m++) {
    const t = atMinute(m)
    const g = railGeometry(t)
    expect(g.segments[g.activeIndex].state).toBe(clockState(t))
  }
})
