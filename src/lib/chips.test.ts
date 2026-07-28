import { describe, expect, test } from 'vitest'
import { activeServices } from '../data'
import { candidates } from './candidates'
import { cravingChipsAt, filterSummary, moodChipsAt } from './chips'
import { clockState } from './clock'

const at = (h: number, m = 0) => new Date(2026, 7, 17, h, m)

const MEAL_TIMES = {
  breakfast: at(8),
  lunch: at(13),
  dinner: at(19),
  lateNight: at(22, 30),
} as const

describe('cravings are scoped to the meal', () => {
  test('breakfast offers what breakfast actually serves', () => {
    const chips = cravingChipsAt(MEAL_TIMES.breakfast)
    expect(chips).toContain('eggs')
    expect(chips).toContain('pancakes')
    expect(chips).toContain('pastry')
    // The whole point: none of these can be served before 11:00.
    expect(chips).not.toContain('pizza')
    expect(chips).not.toContain('sushi')
    expect(chips).not.toContain('taco')
  })

  test('dinner offers what dinner actually serves', () => {
    const chips = cravingChipsAt(MEAL_TIMES.dinner)
    expect(chips).toContain('sushi')
    expect(chips).toContain('steak')
    // Nobody is served pancakes at 7pm on this property.
    expect(chips).not.toContain('pancakes')
    expect(chips).not.toContain('eggs')
  })

  test('every chip returns something at the meal it is offered', () => {
    // A chip that cannot return anything is a dead end the user only
    // discovers by tapping it.
    for (const [meal, t] of Object.entries(MEAL_TIMES)) {
      for (const chip of cravingChipsAt(t)) {
        const list = candidates(t, { cravings: [chip] })
        expect(list.length, `"${chip}" returned nothing at ${meal}`).toBeGreaterThan(0)
      }
    }
  })

  test('every service is reachable from its own meal row', () => {
    // The invariant that rules out capping the row by frequency: sushi and
    // teppanyaki carry one dinner service each and rank last, so a top-N cut
    // would leave Soy and Kimonos unreachable from the chips at any hour.
    for (const service of activeServices) {
      const t = MEAL_TIMES[service.meal as keyof typeof MEAL_TIMES]
      if (!t || clockState(t) !== service.meal) continue
      const chips = cravingChipsAt(t)
      const reachable = service.keywords.some((k) => chips.includes(k))
      expect(reachable, `${service.id} is unreachable from the ${service.meal} row`).toBe(true)
    }
  })

  test('ordered by how many services carry each', () => {
    const t = MEAL_TIMES.dinner
    // Counted over the same pool the chips are drawn from: dinner services
    // the party is old enough for.
    const pool = activeServices.filter((s) => s.meal === 'dinner' && s.minAge === null)
    const counts = cravingChipsAt(t).map((k) => pool.filter((s) => s.keywords.includes(k)).length)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })

  test('12+ only keywords are hidden while the party has an under-12', () => {
    // duck and lamb are carried by Le Petit Chateau alone, which is 12+.
    expect(cravingChipsAt(MEAL_TIMES.dinner)).not.toContain('duck')
    // Lift the age filter and they come back.
    expect(cravingChipsAt(MEAL_TIMES.dinner, 99)).toContain('duck')
  })

  test('attribute keywords never appear as cravings', () => {
    for (const t of Object.values(MEAL_TIMES)) {
      for (const attribute of ['vegetarian', 'buffet', 'grill', 'fried']) {
        expect(cravingChipsAt(t)).not.toContain(attribute)
      }
    }
  })

  test('the gap offers whatever is open across every meal', () => {
    // 16:00: lunch is over and dinner has not started, so the row is drawn
    // from the snack bars and cafés that are actually serving.
    const chips = cravingChipsAt(at(16))
    expect(chips.length).toBeGreaterThan(0)
    expect(chips).toContain('coffee')
  })
})

describe('moods are scoped to the meal', () => {
  test('"somewhere nice" is dinner-only, because evening dress is', () => {
    expect(moodChipsAt(MEAL_TIMES.dinner)).toContain('nice')
    expect(moodChipsAt(MEAL_TIMES.breakfast)).not.toContain('nice')
  })

  test('every mood offered returns something', () => {
    for (const [meal, t] of Object.entries(MEAL_TIMES)) {
      for (const mood of moodChipsAt(t)) {
        const list = candidates(t, { moods: [mood] })
        expect(list.length, `mood "${mood}" returned nothing at ${meal}`).toBeGreaterThan(0)
      }
    }
  })

  test('surprise is never offered', () => {
    for (const t of Object.values(MEAL_TIMES)) {
      expect(moodChipsAt(t)).not.toContain('surprise')
    }
  })
})

describe('craving + clock', () => {
  test('a craving and a mood that cannot co-exist returns empty, not garbage', () => {
    // Soy is the only sushi and it is à la carte, so "quick and easy" kills it.
    // The UI owns this case; candidates() correctly refuses to invent one.
    expect(candidates(at(19), { cravings: ['sushi'], moods: ['quick'] })).toEqual([])
  })

  test('the forward shift still fires before a meal opens', () => {
    // 06:15 — breakfast chips are showing but nothing opens until 06:30.
    const list = candidates(at(6, 15), { cravings: ['eggs'] })
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((c) => c.opensAt !== undefined)).toBe(true)
  })
})

test('filterSummary names what the user has to undo', () => {
  expect(filterSummary(['sushi'], ['quick'])).toBe('sushi + Quick and easy')
  expect(filterSummary(['pizza', 'pasta'], [])).toBe('pizza + pasta')
})
