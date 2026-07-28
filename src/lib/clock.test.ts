import { describe, expect, it } from 'vitest'
import { clockState, formatTime, minutesOfDay } from './clock'

/** A Date on a fixed day at the given local time. */
const at = (h: number, m = 0) => new Date(2026, 7, 17, h, m)

describe('minutesOfDay', () => {
  it('counts from local midnight', () => {
    expect(minutesOfDay(at(0, 0))).toBe(0)
    expect(minutesOfDay(at(17, 30))).toBe(1050)
    expect(minutesOfDay(at(23, 59))).toBe(1439)
  })
})

describe('clockState', () => {
  it('uses half-open intervals at every boundary', () => {
    expect(clockState(at(5, 59))).toBe('breakfast')
    expect(clockState(at(6, 0))).toBe('breakfast')
    expect(clockState(at(10, 59))).toBe('breakfast')
    expect(clockState(at(11, 0))).toBe('lunch')
    expect(clockState(at(15, 29))).toBe('lunch')
    expect(clockState(at(15, 30))).toBe('gap')
    expect(clockState(at(16, 59))).toBe('gap')
    expect(clockState(at(17, 0))).toBe('dinner')
    expect(clockState(at(21, 29))).toBe('dinner')
    expect(clockState(at(21, 30))).toBe('lateNight')
  })

  it('runs lateNight through 02:00 and hands 02:00–06:00 to breakfast', () => {
    expect(clockState(at(23, 59))).toBe('lateNight')
    expect(clockState(at(0, 30))).toBe('lateNight')
    expect(clockState(at(1, 59))).toBe('lateNight')
    expect(clockState(at(2, 0))).toBe('breakfast')
    expect(clockState(at(5, 59))).toBe('breakfast')
  })

  it('never infers gap as a service meal', () => {
    // gap is in the meals array in services.json but no record carries it.
    expect(clockState(at(16, 0))).toBe('gap')
  })
})

describe('formatTime', () => {
  it('renders 12-hour times', () => {
    expect(formatTime(0)).toBe('12:00 AM')
    expect(formatTime(690)).toBe('11:30 AM')
    expect(formatTime(720)).toBe('12:00 PM')
    expect(formatTime(1050)).toBe('5:30 PM')
  })
})
