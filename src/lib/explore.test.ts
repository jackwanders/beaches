import { describe, expect, test } from 'vitest'
import { services, venueBySlug, venues, villages } from '../data'
import { mealsFor, servicesByMeal, venuesByVillage } from './explore'
import { defaultMode } from './trip'

const flatVenues = () => venuesByVillage().flatMap((g) => g.venues.map((v) => v.slug))
const flatServices = () => servicesByMeal().flatMap((g) => g.services.map((s) => s.id))

describe('venuesByVillage', () => {
  test('lists every venue exactly once — no repeats per service', () => {
    // The point of grouping by village: Barefoot serves three meals and is
    // still one row.
    const slugs = flatVenues()
    expect(slugs.length).toBe(venues.length)
    expect(new Set(slugs).size).toBe(venues.length)
    expect(slugs.filter((s) => s === 'barefoot').length).toBe(1)
  })

  test("Mario's is reachable here and nowhere else", () => {
    expect(flatVenues()).toContain('marios')
  })

  test('skips villages with no venues', () => {
    expect(villages.find((v) => v.id === 'seaside')).toBeTruthy()
    expect(venuesByVillage().map((g) => g.key)).not.toContain('seaside')
  })

  test('follows the order the resort lists its villages', () => {
    const keys = venuesByVillage().map((g) => g.key)
    expect(keys).toEqual(villages.map((v) => v.id).filter((id) => keys.includes(id)))
  })

  test('sorts venues alphabetically within a village', () => {
    for (const group of venuesByVillage()) {
      const names = group.venues.map((v) => v.name)
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    }
  })

  test('the starred filter keeps a venue if any of its services is starred', () => {
    // Only dinner is starred; the venue still appears, once.
    const groups = venuesByVillage({ starredOnly: true, favorites: ['barefoot-dinner'] })
    expect(groups.flatMap((g) => g.venues.map((v) => v.slug))).toEqual(['barefoot'])
  })

  test('starring nothing yields no groups rather than empty headings', () => {
    expect(venuesByVillage({ starredOnly: true, favorites: [] })).toEqual([])
  })
})

describe('mealsFor', () => {
  test('returns a venue’s meals in day order', () => {
    expect(mealsFor('barefoot')).toEqual(['breakfast', 'lunch', 'dinner'])
  })

  test('handles a single-service venue', () => {
    expect(mealsFor('soy')).toEqual(['dinner'])
  })

  test('is empty for a slug that serves nothing', () => {
    expect(mealsFor('nowhere')).toEqual([])
  })
})

describe('servicesByMeal', () => {
  test('every service appears exactly once', () => {
    const ids = flatServices()
    expect(ids.length).toBe(services.length)
    expect(new Set(ids).size).toBe(services.length)
  })

  test('12+ services are catalogued rather than filtered out', () => {
    expect(flatServices()).toContain('sky-dinner')
    expect(flatServices()).toContain('le-petit-chateau-dinner')
  })

  test('groups run in day order, not alphabetical', () => {
    expect(servicesByMeal().map((g) => g.key)).toEqual([
      'breakfast',
      'lunch',
      'snacks',
      'dinner',
      'lateNight',
    ])
  })

  test('sorts by venue name within a meal', () => {
    for (const group of servicesByMeal()) {
      const names = group.services.map((s) => venueBySlug.get(s.venue)?.name ?? s.venue)
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
    }
  })

  test('the starred filter narrows to exactly what was starred', () => {
    const favorites = ['neptunes-dinner', 'sky-dinner']
    const groups = servicesByMeal({ starredOnly: true, favorites })
    expect(groups.flatMap((g) => g.services.map((s) => s.id)).sort()).toEqual(
      [...favorites].sort(),
    )
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
