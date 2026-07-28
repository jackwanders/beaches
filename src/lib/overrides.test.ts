import { describe, expect, it, test } from 'vitest'
import { activeServices, services } from '../data'
import { applyOverrides, fromTimeInput, isClosedByOverride, toTimeInput, withOverride } from './overrides'
import { isOpenAt } from './candidates'

const find = (list = activeServices, id = 'schooners-breakfast') => list.find((s) => s.id === id)!

describe('applyOverrides', () => {
  it('passes services through untouched when there are none', () => {
    expect(applyOverrides(activeServices, {})).toHaveLength(activeServices.length)
  })

  it('merges hours before any time comparison', () => {
    const before = find()
    expect(before.closes).toBe(660) // 11:00
    expect(isOpenAt(before, 630)).toBe(true) // 10:30

    const after = find(applyOverrides(activeServices, { 'schooners-breakfast': { closes: 600 } }))
    expect(after.closes).toBe(600)
    expect(isOpenAt(after, 630)).toBe(false)
  })

  it('drops a service marked closed', () => {
    const list = applyOverrides(activeServices, { 'schooners-breakfast': { closed: true } })
    expect(list.some((s) => s.id === 'schooners-breakfast')).toBe(false)
    expect(list).toHaveLength(activeServices.length - 1)
  })

  it('does not mutate the source records', () => {
    applyOverrides(activeServices, { 'schooners-breakfast': { closes: 600 } })
    expect(find().closes).toBe(660)
  })

  it('carries closedDays through', () => {
    const after = find(applyOverrides(activeServices, { 'schooners-breakfast': { closedDays: [3] } }))
    expect(after.closedDays).toEqual([3])
  })
})

describe('time inputs', () => {
  test('round-trip minutes through the <input type="time"> format', () => {
    for (const m of [0, 60, 390, 690, 1050, 1439]) {
      expect(fromTimeInput(toTimeInput(m))).toBe(m)
    }
  })

  test('null hours have no value to show', () => {
    expect(toTimeInput(null)).toBe('')
    expect(toTimeInput(undefined)).toBe('')
  })

  test('pads so the picker accepts it', () => {
    expect(toTimeInput(390)).toBe('06:30')
    expect(toTimeInput(0)).toBe('00:00')
  })

  test('an empty or impossible field reads as unset, not as midnight', () => {
    expect(fromTimeInput('')).toBeNull()
    expect(fromTimeInput('   ')).toBeNull()
    expect(fromTimeInput('25:00')).toBeNull()
    expect(fromTimeInput('12:60')).toBeNull()
    expect(fromTimeInput('nonsense')).toBeNull()
  })
})

describe('withOverride', () => {
  const schooners = services.find((s) => s.id === 'schooners-breakfast')!

  test('leaves an untouched service identical', () => {
    expect(withOverride(schooners, {})).toBe(schooners)
  })

  test('merges only the fields that were set', () => {
    const merged = withOverride(schooners, { 'schooners-breakfast': { closes: 600 } })
    expect(merged.closes).toBe(600)
    expect(merged.opens).toBe(schooners.opens)
  })

  test('keeps a closed service visible, unlike applyOverrides', () => {
    // The detail sheet has to render what you closed so you can reopen it.
    const overrides = { 'schooners-breakfast': { closed: true } }
    expect(withOverride(schooners, overrides).id).toBe('schooners-breakfast')
    expect(applyOverrides([schooners], overrides)).toEqual([])
    expect(isClosedByOverride('schooners-breakfast', overrides)).toBe(true)
  })
})
