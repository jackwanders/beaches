import { describe, expect, test } from 'vitest'
import { keywordVocabulary } from '../data'
import { isOpenAt } from './candidates'
import { minutesOfDay } from './clock'
import { search, suggest } from './search'

const at = (h: number, m = 0) => new Date(2026, 7, 17, h, m)
const ids = (hits: { service: { id: string } }[]) => hits.map((h) => h.service.id)

describe('suggest', () => {
  test('an empty query offers the whole vocabulary', () => {
    expect(suggest('')).toEqual(keywordVocabulary)
    expect(suggest('   ')).toEqual(keywordVocabulary)
  })

  test('matches anywhere in the term', () => {
    expect(suggest('sus')).toEqual(['sushi'])
    expect(suggest('cream')).toEqual(['ice cream'])
  })

  test('prefix matches rank above interior ones', () => {
    // Both contain "ice"; only one starts with it.
    expect(suggest('ice')).toEqual(['ice cream', 'rice'])
  })

  test('an unknown term suggests nothing rather than guessing', () => {
    expect(suggest('quinoa')).toEqual([])
  })
})

describe('search', () => {
  test('sushi at 09:00 finds Soy and says when it opens', () => {
    // The acceptance check that moved here when the chips became meal-scoped:
    // "tapping sushi at 09:00 offers Soy at 17:30 rather than no results".
    const hits = search('sushi', at(9))
    expect(ids(hits)).toEqual(['soy-dinner'])
    expect(hits[0].opensAt).toBe(17 * 60 + 30)
  })

  test('the same search at dinner reports it open', () => {
    const hits = search('sushi', at(19))
    expect(hits[0].opensAt).toBeUndefined()
  })

  test('open-now is a sort, not a filter', () => {
    const t = at(13)
    const hits = search('dessert', t)
    // Every meal that carries the keyword is present, not just lunch.
    expect(new Set(hits.map((h) => h.service.meal)).size).toBeGreaterThan(1)
    // Open ones lead; closed ones follow, and each says when it opens.
    const firstClosed = hits.findIndex((h) => h.opensAt !== undefined)
    if (firstClosed !== -1) {
      expect(hits.slice(firstClosed).every((h) => h.opensAt !== undefined)).toBe(true)
      expect(hits.slice(0, firstClosed).every((h) => isOpenAt(h.service, minutesOfDay(t)))).toBe(
        true,
      )
    }
  })

  test('closed matches are ordered by how soon they open', () => {
    const hits = search('fish', at(9)).filter((h) => h.opensAt !== undefined)
    const untils = hits.map((h) => h.service.opens!)
    expect(untils).toEqual([...untils].sort((a, b) => a - b))
  })

  test('names the signature dishes that matched, where known', () => {
    const hits = search('salad', at(13))
    const withDishes = hits.filter((h) => h.matchedDishes.length > 0)
    expect(withDishes.length).toBeGreaterThan(0)
    for (const hit of withDishes) {
      for (const dish of hit.matchedDishes) {
        expect(dish.toLowerCase()).toContain('salad')
      }
    }
  })

  test('a service with no matching dish simply carries none', () => {
    // Buffet services carry keywords but no dish naming them.
    const hits = search('buffet', at(19))
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => Array.isArray(h.matchedDishes))).toBe(true)
  })

  test('respects the party age filter, and lifting it brings 12+ back', () => {
    // duck is carried by Le Petit Chateau alone, which is 12+.
    expect(search('duck', at(19))).toEqual([])
    expect(ids(search('duck', at(19), { youngestInParty: 99 }))).toEqual([
      'le-petit-chateau-dinner',
    ])
  })

  test('an empty keyword returns nothing rather than everything', () => {
    expect(search('', at(19))).toEqual([])
  })

  test('overrides apply before the open-now sort', () => {
    const t = at(9)
    const closed = search('eggs', t).find((h) => h.service.id === 'schooners-breakfast')
    expect(closed?.opensAt).toBeUndefined() // open at 09:00 normally
    const overridden = search('eggs', t, {
      overrides: { 'schooners-breakfast': { opens: 660, closes: 700 } },
    }).find((h) => h.service.id === 'schooners-breakfast')
    expect(overridden?.opensAt).toBe(660)
  })
})
