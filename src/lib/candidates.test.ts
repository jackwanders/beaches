import { describe, expect, it } from 'vitest'
import { activeServices } from '../data'
import { candidates, isOpenAt, rerollWindow } from './candidates'

const at = (h: number, m = 0) => new Date(2026, 7, 17, h, m)
const service = (id: string) => activeServices.find((s) => s.id === id)!
const ids = (list: { service: { id: string } }[]) => list.map((c) => c.service.id)

describe('isOpenAt', () => {
  it('uses half-open hours', () => {
    const s = service('schooners-breakfast') // 07:30–11:00
    expect(isOpenAt(s, 449)).toBe(false)
    expect(isOpenAt(s, 450)).toBe(true)
    expect(isOpenAt(s, 659)).toBe(true)
    expect(isOpenAt(s, 660)).toBe(false)
  })

  it('handles the one service that crosses midnight', () => {
    const s = service('cricketers-latenight') // 22:00–02:00
    expect(s.crossesMidnight).toBe(true)
    expect(isOpenAt(s, 23 * 60 + 30)).toBe(true) // 23:30
    expect(isOpenAt(s, 30)).toBe(true) // 00:30
    expect(isOpenAt(s, 150)).toBe(false) // 02:30
    expect(isOpenAt(s, 18 * 60)).toBe(false) // 18:00
  })

  it('treats null hours as always open', () => {
    for (const id of ['the-dive-snacks', 'calypsos-snacks']) {
      const s = service(id)
      expect(s.opens).toBeNull()
      expect(isOpenAt(s, 0)).toBe(true)
      expect(isOpenAt(s, 16 * 60)).toBe(true)
    }
  })
})

describe('minAge', () => {
  it('keeps Sky at breakfast regardless of party age', () => {
    expect(ids(candidates(at(8), { youngestInParty: 8 }))).toContain('sky-breakfast')
    expect(ids(candidates(at(8), { youngestInParty: 40 }))).toContain('sky-breakfast')
  })

  it('drops the 12+ dinner services only when someone is under 12', () => {
    const under = ids(candidates(at(19), { youngestInParty: 8 }))
    const over = ids(candidates(at(19), { youngestInParty: 40 }))
    expect(under).not.toContain('sky-dinner')
    expect(over).toContain('sky-dinner')
    expect(over).toContain('sapodillas-dinner')
    expect(over).toContain('le-petit-chateau-dinner')
  })
})

describe('the gap', () => {
  it('returns what is actually open at 16:00, across every meal', () => {
    const list = ids(candidates(at(16)))
    expect(list.length).toBeGreaterThan(3)
    expect(list).toContain('cricketers-lunch')
    expect(list).toContain('cafe-de-paris-snacks')
    expect(list).toContain('bru-snacks')
    // Null-hours services are open, not hidden.
    expect(list).toContain('the-dive-snacks')
    // Nothing that is actually shut.
    expect(list).not.toContain('arizonas-lunch') // closes 16:00, half-open
    expect(list).not.toContain('neptunes-dinner')
    // Every result is genuinely open now — no forward shift needed.
    expect(candidates(at(16)).every((c) => c.opensAt === undefined)).toBe(true)
  })
})

describe('meal filtering', () => {
  it('lets only the current meal compete during a real meal', () => {
    const lunch = candidates(at(12))
    expect(lunch.every((c) => c.service.meal === 'lunch')).toBe(true)
    // Café de Paris is open at noon but is a snack service — it does not pad lunch.
    expect(ids(lunch)).not.toContain('cafe-de-paris-snacks')
  })

  it('honours an explicit meal over the clock', () => {
    // "Where should we eat dinner tonight?" asked at 9am.
    const dinner = candidates(at(9), { meal: 'dinner' })
    expect(dinner.length).toBeGreaterThan(0)
    expect(dinner.every((c) => c.service.meal === 'dinner')).toBe(true)
    expect(dinner.every((c) => c.opensAt !== undefined)).toBe(true)
  })

  it('relaxes an explicit meal only when it would otherwise return nothing', () => {
    // No breakfast service carries sushi; never-zero still wins.
    const list = candidates(at(9), { meal: 'breakfast', cravings: ['sushi'] })
    expect(ids(list)).toEqual(['soy-dinner'])
  })

  it('separates Sky and Butch’s by meal, not by venue', () => {
    const breakfast = candidates(at(8), { youngestInParty: 8 })
    expect(ids(breakfast)).toContain('butchs-breakfast')
    expect(breakfast.find((c) => c.service.id === 'butchs-breakfast')!.service.reservation).toBe(
      false,
    )
    const dinner = candidates(at(19), { youngestInParty: 8 })
    expect(dinner.find((c) => c.service.id === 'butchs-dinner')!.service.reservation).toBe(true)
  })
})

describe('never zero', () => {
  it('shifts sushi at 09:00 forward to Soy at 17:30', () => {
    const list = candidates(at(9), { cravings: ['sushi'] })
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].service.id).toBe('soy-dinner')
    expect(list[0].opensAt).toBe(1050)
  })

  it('returns something for every hour of the day', () => {
    for (let h = 0; h < 24; h++) {
      expect(candidates(at(h)).length, `${h}:00`).toBeGreaterThan(0)
    }
  })

  it('does not relax minAge to fill the list', () => {
    const list = candidates(at(19), { moods: ['nice'], youngestInParty: 8 })
    expect(list.every((c) => c.service.minAge === null || c.service.minAge <= 8)).toBe(true)
  })
})

describe('cravings and moods', () => {
  it('intersects keywords', () => {
    const list = candidates(at(19), { cravings: ['pasta'] })
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((c) => c.service.keywords.includes('pasta'))).toBe(true)
  })

  it('applies mood predicates', () => {
    const quick = candidates(at(12), { moods: ['quick'] })
    expect(quick.length).toBeGreaterThan(0)
    expect(
      quick.every((c) => c.service.format === 'truck' || c.service.format === 'quickservice'),
    ).toBe(true)
  })

  it('narrows when both are set', () => {
    const both = candidates(at(12), { cravings: ['pizza'], moods: ['quick'] })
    const cravingOnly = candidates(at(12), { cravings: ['pizza'] })
    expect(both.length).toBeLessThanOrEqual(cravingOnly.length)
  })
})

describe('overrides', () => {
  it('changes what Schooners returns at breakfast', () => {
    const before = ids(candidates(at(10, 30)))
    expect(before).toContain('schooners-breakfast')
    const after = ids(candidates(at(10, 30), { overrides: { 'schooners-breakfast': { closes: 600 } } }))
    expect(after).not.toContain('schooners-breakfast')
  })

  it('respects closedDays', () => {
    const wednesday = new Date(2026, 7, 19, 10, 30)
    expect(wednesday.getDay()).toBe(3)
    const list = ids(candidates(wednesday, { overrides: { 'schooners-breakfast': { closedDays: [3] } } }))
    expect(list).not.toContain('schooners-breakfast')
  })
})

describe('ranking', () => {
  it('is stable within a day and rotates between days', () => {
    expect(ids(candidates(at(19)))).toEqual(ids(candidates(at(19, 15))))

    const day17 = ids(candidates(new Date(2026, 7, 17, 19)))
    const day18 = ids(candidates(new Date(2026, 7, 18, 19)))
    expect(day18).not.toEqual(day17)
    // A rotation, not a reshuffle: the same set, different lead.
    expect([...day18].sort()).toEqual([...day17].sort())
  })
})

describe('rerollWindow', () => {
  const list = [1, 2, 3, 4, 5, 6, 7, 8]

  it('returns three per page', () => {
    expect(rerollWindow(list, 0)).toEqual([1, 2, 3])
    expect(rerollWindow(list, 1)).toEqual([4, 5, 6])
  })

  it('wraps when the length is not divisible by three', () => {
    expect(rerollWindow(list, 2)).toEqual([7, 8, 1])
    expect(rerollWindow(list, 3)).toEqual([2, 3, 4])
  })

  it('returns what there is when fewer than three exist', () => {
    expect(rerollWindow([1, 2], 0)).toEqual([1, 2])
    expect(rerollWindow([1, 2], 5)).toEqual([1, 2])
    expect(rerollWindow([], 0)).toEqual([])
  })

  it('never reshuffles — every page preserves source order', () => {
    const seen = rerollWindow(list, 1)
    expect(seen).toEqual([4, 5, 6])
    expect(rerollWindow(list, 1)).toEqual(seen)
  })
})
