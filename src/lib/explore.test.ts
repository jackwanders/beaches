import { describe, expect, test } from 'vitest'
import { services, venueBySlug, villages } from '../data'
import { exploreGroups } from './explore'
import { defaultMode } from './trip'

const flat = (groupBy: 'village' | 'meal') =>
  exploreGroups(groupBy).flatMap((g) => g.services.map((s) => s.id))

describe('exploreGroups', () => {
  test('every service appears exactly once, whichever way it is grouped', () => {
    for (const groupBy of ['village', 'meal'] as const) {
      const ids = flat(groupBy)
      expect(ids.length, `${groupBy} lost or duplicated services`).toBe(services.length)
      expect(new Set(ids).size).toBe(services.length)
    }
  })

  test("Mario's is reachable here and nowhere else", () => {
    // operational: false, so candidates() and search() both exclude it. The
    // spec requires it stay visible in the browse list.
    expect(flat('village')).toContain('marios-dinner')
  })

  test('12+ services are catalogued rather than filtered out', () => {
    // The party filter is for recommendations, not for reading about the
    // resort in July.
    expect(flat('meal')).toContain('sky-dinner')
    expect(flat('meal')).toContain('le-petit-chateau-dinner')
  })

  test('skips villages with no venues', () => {
    // Seaside Village is in the data and holds nothing.
    const seaside = villages.find((v) => v.id === 'seaside')
    expect(seaside, 'expected a seaside village in the seed data').toBeTruthy()
    expect(exploreGroups('village').map((g) => g.key)).not.toContain('seaside')
  })

  test('village groups follow the order the resort lists them', () => {
    const keys = exploreGroups('village').map((g) => g.key)
    const expected = villages.map((v) => v.id).filter((id) => keys.includes(id))
    expect(keys).toEqual(expected)
  })

  test('meal groups run in day order, not alphabetical', () => {
    expect(exploreGroups('meal').map((g) => g.key)).toEqual([
      'breakfast',
      'lunch',
      'snacks',
      'dinner',
      'lateNight',
    ])
  })

  test('services sort by venue name within a group', () => {
    for (const group of exploreGroups('village')) {
      const names = group.services.map((s) => venueBySlug.get(s.venue)?.name ?? s.venue)
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    }
  })

  test('the starred filter narrows to exactly what was starred', () => {
    const favorites = ['neptunes-dinner', 'sky-dinner']
    const groups = exploreGroups('meal', { starredOnly: true, favorites })
    expect(groups.flatMap((g) => g.services.map((s) => s.id)).sort()).toEqual(
      [...favorites].sort(),
    )
  })

  test('starring nothing yields no groups rather than an empty heading', () => {
    expect(exploreGroups('village', { starredOnly: true, favorites: [] })).toEqual([])
  })
})

describe('defaultMode', () => {
  test('explores before the trip', () => {
    expect(defaultMode(new Date(2026, 6, 28))).toBe('explore')
  })

  test('switches to now on arrival day and stays through the last night', () => {
    expect(defaultMode(new Date(2026, 7, 15, 9))).toBe('now')
    expect(defaultMode(new Date(2026, 7, 19, 23, 59))).toBe('now')
  })

  test('goes back to explore once the trip is over', () => {
    expect(defaultMode(new Date(2026, 7, 20, 0, 1))).toBe('explore')
  })
})
