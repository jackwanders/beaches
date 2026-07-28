import { describe, expect, test } from 'vitest'
import { activeServices, venues } from '../data'
import type { Service } from '../types'
import { MEAL_LABELS, badgesFor, headline, serviceStatus, villageName } from './display'

const byId = (id: string): Service => activeServices.find((s) => s.id === id)!
const open = (id: string) => ({ service: byId(id) })

describe('villageName', () => {
  test('strips the redundant suffix', () => {
    expect(villageName('key-west')).toBe('Key West')
    expect(villageName('italian')).toBe('Italian')
  })

  test('leaves names that do not carry it', () => {
    expect(villageName('waterpark')).toBe('Pirates Island Waterpark')
  })

  test('resolves every village a venue actually references', () => {
    for (const v of venues) {
      expect(villageName(v.village)).not.toBe(v.village)
    }
  })
})

describe('serviceStatus', () => {
  test('open now reads as a closing time', () => {
    // neptunes-dinner runs 17:00–21:30.
    expect(serviceStatus(open('neptunes-dinner'), 19 * 60)).toEqual({
      text: 'Open till 9:30 PM',
      tone: 'open',
    })
  })

  test('closing-soon boundary is exact', () => {
    // 45 minutes out is soon; 46 is not.
    expect(serviceStatus(open('neptunes-dinner'), 21 * 60 - 15).tone).toBe('soon')
    expect(serviceStatus(open('neptunes-dinner'), 21 * 60 - 16).tone).toBe('open')
  })

  test('minutes-to-close wraps past midnight', () => {
    // cricketers-latenight is 22:00–02:00, the only crossesMidnight service.
    expect(serviceStatus(open('cricketers-latenight'), 90)).toEqual({
      text: 'Closes in 30 min',
      tone: 'soon',
    })
    // Three hours earlier it must not be "soon", and must not be a huge number.
    expect(serviceStatus(open('cricketers-latenight'), 23 * 60).tone).toBe('open')
  })

  test('null hours read as open, not closed', () => {
    expect(serviceStatus(open('the-dive-snacks'), 16 * 60)).toEqual({
      text: 'Open · hours unconfirmed',
      tone: 'unknown',
    })
  })

  test('a forward-shifted candidate names its opening time', () => {
    // The spec's "Soy opens at 5:30 — sushi tonight?" case.
    const shifted = { service: byId('soy-dinner'), opensAt: 1050 }
    expect(serviceStatus(shifted, 9 * 60)).toEqual({
      text: 'Opens at 5:30 PM',
      tone: 'later',
    })
  })
})

describe('headline', () => {
  test('explains the gap rather than showing an empty lunch list', () => {
    expect(headline('gap', [open('cricketers-lunch')])).toBe(
      'Lunch is over. Dinner starts at 5:00 PM. Open right now:',
    )
  })

  test('says so when every answer is in the future', () => {
    const shifted = [{ service: byId('soy-dinner'), opensAt: 1050 }]
    expect(headline('breakfast', shifted)).toBe("Nothing's open right now. Coming up:")
  })

  test('stays quiet during a normal meal', () => {
    expect(headline('dinner', [open('neptunes-dinner')])).toBeNull()
  })
})

describe('badges', () => {
  test('dinner at Butch’s carries reservation and evening attire', () => {
    expect(badgesFor(byId('butchs-dinner'))).toEqual(['reservation', 'evening attire'])
  })

  test('the same venue at breakfast carries neither', () => {
    expect(badgesFor(byId('butchs-breakfast'))).toEqual([])
  })

  test('Sky is 12+ at dinner only', () => {
    expect(badgesFor(byId('sky-dinner'))).toContain('12+')
    expect(badgesFor(byId('sky-breakfast'))).not.toContain('12+')
  })

  test('every clock state has a label', () => {
    expect(MEAL_LABELS.gap).toBe('BETWEEN MEALS')
    expect(MEAL_LABELS.lateNight).toBe('LATE NIGHT')
  })
})
