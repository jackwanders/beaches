import { describe, expect, it } from 'vitest'
import { activeServices, keywordVocabulary, services, venueBySlug, venues } from './data'

describe('seed data', () => {
  it('loads 44 services and 27 venues', () => {
    expect(services).toHaveLength(44)
    expect(venues).toHaveLength(27)
    expect(keywordVocabulary.length).toBeGreaterThan(30)
  })

  it('reads meal from the field, never from the id', () => {
    // Two ids end in -snacks while carrying meal: "lunch".
    for (const id of ['bobby-dees-snacks', 'mr-mac-snacks']) {
      const s = services.find((x) => x.id === id)!
      expect(s.id.endsWith('-snacks')).toBe(true)
      expect(s.meal).toBe('lunch')
    }
  })

  it('keeps Mario’s venue but drops its services from query paths', () => {
    expect(venueBySlug.get('marios')!.operational).toBe(false)
    expect(activeServices).toHaveLength(42)
    expect(activeServices.some((s) => s.venue === 'marios')).toBe(false)
  })

  it('every service points at a real venue', () => {
    for (const s of services) expect(venueBySlug.has(s.venue)).toBe(true)
  })
})
