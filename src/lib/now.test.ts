import { describe, expect, test } from 'vitest'
import { parseTimeParam, simulatedOffsetMs, youngestOverride } from './now'

describe('parseTimeParam', () => {
  test('accepts the forms actually typed', () => {
    expect(parseTimeParam('?t=16:00')).toEqual({ hours: 16, minutes: 0 })
    expect(parseTimeParam('?t=8:05')).toEqual({ hours: 8, minutes: 5 })
    expect(parseTimeParam('?t=00:30')).toEqual({ hours: 0, minutes: 30 })
  })

  test('rejects anything else rather than guessing', () => {
    expect(parseTimeParam('?t=25:00')).toBeNull()
    expect(parseTimeParam('?t=12:60')).toBeNull()
    expect(parseTimeParam('?t=abc')).toBeNull()
    expect(parseTimeParam('?t=')).toBeNull()
    expect(parseTimeParam('')).toBeNull()
  })
})

test('simulatedOffsetMs lands on the requested time the same day', () => {
  const real = new Date(2026, 7, 17, 9, 12, 34)
  const shifted = new Date(real.getTime() + simulatedOffsetMs('?t=16:00', real))
  expect(shifted.getHours()).toBe(16)
  expect(shifted.getMinutes()).toBe(0)
  expect(shifted.getDate()).toBe(17)
})

test('an absent param leaves the real clock alone', () => {
  expect(simulatedOffsetMs('', new Date())).toBe(0)
})

test('youngestOverride only fires on the explicit opt-out', () => {
  expect(youngestOverride('?u12=0')).toBe(99)
  expect(youngestOverride('?u12=1')).toBeUndefined()
  expect(youngestOverride('')).toBeUndefined()
})
