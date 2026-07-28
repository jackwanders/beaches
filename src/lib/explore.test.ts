import { describe, expect, test } from 'vitest'
import { venues, villages } from '../data'
import {
  exploreVenues,
  mealOptions,
  mealsFor,
  serviceAt,
  villageOptions,
} from './explore'
import { defaultMode } from './trip'

const flat = (f = {}) => exploreVenues(f).flatMap((g) => g.venues.map((v) => v.slug))
const countOf = (opts: { id: string | null; count: number }[], id: string | null) =>
  opts.find((o) => o.id === id)!.count

describe('exploreVenues', () => {
  test('lists every venue once when nothing is filtered', () => {
    const slugs = flat()
    expect(slugs.length).toBe(venues.length)
    expect(new Set(slugs).size).toBe(venues.length)
  })

  test("Mario's is reachable here and nowhere else", () => {
    expect(flat()).toContain('marios')
  })

  test('filters by village', () => {
    const italian = exploreVenues({ village: 'italian' })
    expect(italian).toHaveLength(1)
    expect(italian[0].key).toBe('italian')
    expect(italian[0].venues.every((v) => v.village === 'italian')).toBe(true)
  })

  test('filters by meal', () => {
    for (const slug of flat({ meal: 'breakfast' })) {
      expect(mealsFor(slug)).toContain('breakfast')
    }
  })

  test('the two filters combine — "Italian Village, lunch"', () => {
    // The question the picker exists to answer.
    const slugs = flat({ village: 'italian', meal: 'lunch' })
    expect(slugs.length).toBeGreaterThan(0)
    for (const slug of slugs) {
      expect(venues.find((v) => v.slug === slug)!.village).toBe('italian')
      expect(mealsFor(slug)).toContain('lunch')
    }
    // Strictly narrower than either filter alone.
    expect(slugs.length).toBeLessThanOrEqual(flat({ village: 'italian' }).length)
    expect(slugs.length).toBeLessThanOrEqual(flat({ meal: 'lunch' }).length)
  })

  test('the starred filter stacks with the other two', () => {
    const favorites = ['cricketers-lunch']
    expect(flat({ starredOnly: true, favorites })).toEqual(['cricketers'])
    expect(flat({ starredOnly: true, favorites, village: 'french' })).toEqual([])
  })

  test('skips villages left empty, including the one that is always empty', () => {
    expect(villages.find((v) => v.id === 'seaside')).toBeTruthy()
    expect(exploreVenues().map((g) => g.key)).not.toContain('seaside')
    expect(exploreVenues({ meal: 'lateNight' }).every((g) => g.venues.length > 0)).toBe(true)
  })

  test('groups follow the order the resort lists its villages', () => {
    const keys = exploreVenues().map((g) => g.key)
    expect(keys).toEqual(villages.map((v) => v.id).filter((id) => keys.includes(id)))
  })
})

describe('picker options', () => {
  test('village counts respect the meal filter, so a dead end shows as 0 first', () => {
    const opts = villageOptions({ meal: 'lateNight' })
    // Only Cricketer's serves late night, and it is in the Italian Village.
    expect(countOf(opts, 'italian')).toBe(1)
    expect(countOf(opts, 'french')).toBe(0)
    expect(countOf(opts, null)).toBe(1)
  })

  test('meal counts respect the village filter', () => {
    const opts = mealOptions({ village: 'italian' })
    const italianVenues = venues.filter((v) => v.village === 'italian').length
    expect(countOf(opts, null)).toBe(italianVenues)
    expect(countOf(opts, 'lateNight')).toBe(1)
  })

  test('an option never counts itself out', () => {
    // Picking a village must not make that village read 0.
    const opts = villageOptions({ village: 'italian' })
    expect(countOf(opts, 'italian')).toBeGreaterThan(0)
    expect(countOf(opts, 'caribbean')).toBeGreaterThan(0)
  })

  test('"all" leads both lists and meals run in day order', () => {
    expect(villageOptions()[0].id).toBeNull()
    expect(mealOptions().map((o) => o.id)).toEqual([
      null,
      'breakfast',
      'lunch',
      'snacks',
      'dinner',
      'lateNight',
    ])
  })

  test('never offers the village that holds nothing', () => {
    expect(villageOptions().map((o) => o.id)).not.toContain('seaside')
  })
})

describe('serviceAt', () => {
  test('finds the venue’s service for a meal', () => {
    expect(serviceAt('barefoot', 'lunch')?.id).toBe('barefoot-lunch')
  })

  test('is undefined for a meal the venue does not serve', () => {
    expect(serviceAt('soy', 'breakfast')).toBeUndefined()
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
