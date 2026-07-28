import { describe, expect, test } from 'vitest'
import summaries from '../../data/summaries.json'
import { activeServices } from '../data'
import { summaryFor } from './summaries'

const lines = summaries as Record<string, string>
const entries = Object.entries(lines)

// These sell rather than describe, and a phone card has no room to sell.
const BANNED = [
  'authentic',
  'delicious',
  'mouthwatering',
  'exquisite',
  'world-class',
  'savory',
  'savoury',
  'sumptuous',
  'delectable',
  'tantalizing',
  'iconic',
  'legendary',
]

describe('summary lines', () => {
  test('every active service has one', () => {
    const missing = activeServices.filter((s) => !(s.id in lines)).map((s) => s.id)
    expect(missing).toEqual([])
  })

  test('none name a service that does not exist', () => {
    const known = new Set(activeServices.map((s) => s.id))
    // Mario's is not operational, so it legitimately has no line.
    expect(entries.filter(([id]) => !known.has(id)).map(([id]) => id)).toEqual([])
  })

  test('fit the card', () => {
    // 45 is what a 412px card holds before truncating; the card also truncates
    // defensively, but a line that needs it has failed.
    const tooLong = entries.filter(([, line]) => line.length > 45)
    expect(tooLong).toEqual([])
  })

  test('describe rather than sell', () => {
    const selling = entries.filter(([, line]) =>
      BANNED.some((word) => line.toLowerCase().includes(word)),
    )
    expect(selling).toEqual([])
  })

  test('follow the house style', () => {
    for (const [id, line] of entries) {
      expect(line, `${id} should not end in a period`).not.toMatch(/\.$/)
      expect(line, `${id} should start capitalised`).toMatch(/^[A-Z]/)
      expect(line, `${id} should use "&" rather than "and"`).not.toMatch(/\band\b/i)
      expect(line, `${id} should not be padded`).toBe(line.trim())
    }
  })

  test('say more than the dish they replaced', () => {
    // The whole point: "Neapolitan pizza & sandwiches" beats "Prosciutto
    // pizza" because it names a range. A line identical to the first
    // signature dish has not earned its place.
    const lazy = activeServices
      .filter((s) => lines[s.id] && lines[s.id] === s.signatureDishes[0])
      .map((s) => s.id)
    expect(lazy).toEqual([])
  })
})

describe('summaryFor', () => {
  test('falls back to the first signature dish when there is no line', () => {
    expect(summaryFor('not-a-service', ['Lamb shank'])).toBe('Lamb shank')
  })

  test('returns undefined when there is neither', () => {
    expect(summaryFor('not-a-service', [])).toBeUndefined()
  })

  test('prefers the summary over the dish', () => {
    const withLine = activeServices.find((s) => lines[s.id] && s.signatureDishes.length > 0)!
    expect(summaryFor(withLine.id, withLine.signatureDishes)).toBe(lines[withLine.id])
  })
})
