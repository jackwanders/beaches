import { describe, expect, it } from 'vitest'
import { activeServices } from '../data'
import { applyOverrides } from './overrides'
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
