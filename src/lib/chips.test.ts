import { describe, expect, test } from 'vitest'
import { candidates } from './candidates'
import { CRAVING_CHIPS, MOOD_CHIPS, filterSummary } from './chips'
import { activeServices } from '../data'

const at = (h: number, m = 0) => new Date(2026, 7, 17, h, m)

describe('craving chips', () => {
  test('every chip matches at least one live service', () => {
    // A chip that can never return anything is a dead end the user has to
    // discover by tapping it.
    for (const chip of CRAVING_CHIPS) {
      const carriers = activeServices.filter((s) => s.keywords.includes(chip))
      expect(carriers.length, `no active service carries "${chip}"`).toBeGreaterThan(0)
    }
  })

  test('ordered by how many services carry each', () => {
    const count = (k: string) => activeServices.filter((s) => s.keywords.includes(k)).length
    const counts = CRAVING_CHIPS.map(count)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
  })

  test('keeps the low-frequency cravings the acceptance checks name', () => {
    // Both carry exactly one service, so a raw frequency ranking would drop
    // them — and "tapping sushi at 09:00" is an explicit acceptance check.
    expect(CRAVING_CHIPS).toContain('sushi')
    expect(CRAVING_CHIPS).toContain('jerk')
  })

  test('excludes the attribute keywords that top the raw frequency list', () => {
    for (const attribute of ['vegetarian', 'grill', 'buffet', 'fried', 'eggs']) {
      expect(CRAVING_CHIPS).not.toContain(attribute)
    }
  })
})

describe('mood chips', () => {
  test('every mood returns something at its own meal', () => {
    // Each mood is checked at a time when its venues are actually open, so a
    // chip never renders as a guaranteed empty result.
    for (const mood of MOOD_CHIPS) {
      const list = candidates(at(19), { moods: [mood] })
      expect(list.length, `mood "${mood}" returned nothing at dinner`).toBeGreaterThan(0)
    }
  })

  test('surprise is not offered as a chip', () => {
    expect(MOOD_CHIPS).not.toContain('surprise')
  })
})

describe('craving + clock', () => {
  test('sushi at 09:00 shifts forward to Soy rather than returning nothing', () => {
    const list = candidates(at(9), { cravings: ['sushi'] })
    expect(list[0].service.id).toBe('soy-dinner')
    expect(list[0].opensAt).toBe(17 * 60 + 30)
  })

  test('a craving and a mood that cannot co-exist returns empty, not garbage', () => {
    // Soy is the only sushi and it is à la carte, so "quick and easy" kills it.
    // The UI must own this case; candidates() correctly refuses to invent one.
    expect(candidates(at(19), { cravings: ['sushi'], moods: ['quick'] })).toEqual([])
  })
})

test('filterSummary names what the user has to undo', () => {
  expect(filterSummary(['sushi'], ['quick'])).toBe('sushi + Quick and easy')
  expect(filterSummary(['pizza', 'pasta'], [])).toBe('pizza + pasta')
})
