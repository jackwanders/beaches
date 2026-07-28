import { describe, expect, test } from 'vitest'
import { mergeBackup, parseBackup, type Backup } from './favorites'

const empty: Backup = { favorites: [], notes: {} }

describe('parseBackup', () => {
  test('accepts what the export button emits', () => {
    const raw = JSON.stringify({
      favorites: ['neptunes-dinner', 'kimonos-dinner'],
      notes: { 'neptunes-dinner': 'lamb shank' },
    })
    expect(parseBackup(raw)).toEqual({
      favorites: ['neptunes-dinner', 'kimonos-dinner'],
      notes: { 'neptunes-dinner': 'lamb shank' },
    })
  })

  test('drops ids that name no real service', () => {
    // A stale export from before a data change, or a typo in a hand-edited file.
    const raw = JSON.stringify({
      favorites: ['neptunes-dinner', 'atlantis-brunch'],
      notes: { 'atlantis-brunch': 'nope', 'kimonos-dinner': 'book ahead' },
    })
    expect(parseBackup(raw)).toEqual({
      favorites: ['neptunes-dinner'],
      notes: { 'kimonos-dinner': 'book ahead' },
    })
  })

  test('rejects input that is not a backup, with a readable message', () => {
    expect(() => parseBackup('not json at all')).toThrow(/exported data/)
    expect(() => parseBackup('"a string"')).toThrow(/exported data/)
    expect(() => parseBackup('null')).toThrow(/exported data/)
    expect(() => parseBackup('{"favorites":[],"notes":{}}')).toThrow(/No stars or notes/)
  })

  test('ignores blank notes rather than storing empty strings', () => {
    const raw = JSON.stringify({
      favorites: ['soy-dinner'],
      notes: { 'soy-dinner': '   ' },
    })
    expect(parseBackup(raw).notes).toEqual({})
  })
})

describe('mergeBackup', () => {
  test('unions stars without duplicating', () => {
    const current: Backup = { favorites: ['a', 'neptunes-dinner'], notes: {} }
    const incoming: Backup = { favorites: ['neptunes-dinner', 'soy-dinner'], notes: {} }
    expect(mergeBackup(current, incoming).favorites).toEqual([
      'a',
      'neptunes-dinner',
      'soy-dinner',
    ])
  })

  test('never discards what is already on the device', () => {
    // Import exists to recover from eviction or move phones; wiping the local
    // copy is the one outcome nobody wants.
    const current: Backup = { favorites: ['soy-dinner'], notes: { 'soy-dinner': 'mine' } }
    const merged = mergeBackup(current, { favorites: ['kimonos-dinner'], notes: {} })
    expect(merged.favorites).toContain('soy-dinner')
    expect(merged.notes['soy-dinner']).toBe('mine')
  })

  test('the imported note wins a collision', () => {
    const current: Backup = { favorites: [], notes: { 'soy-dinner': 'old' } }
    const incoming: Backup = { favorites: [], notes: { 'soy-dinner': 'new' } }
    expect(mergeBackup(current, incoming).notes['soy-dinner']).toBe('new')
  })

  test('merging into nothing yields the incoming backup', () => {
    const incoming: Backup = { favorites: ['soy-dinner'], notes: { 'soy-dinner': 'x' } }
    expect(mergeBackup(empty, incoming)).toEqual(incoming)
  })
})

test('a backup round-trips through export and import unchanged', () => {
  const original: Backup = {
    favorites: ['neptunes-dinner', 'soy-dinner'],
    notes: { 'soy-dinner': 'sit at the bar' },
  }
  expect(mergeBackup(empty, parseBackup(JSON.stringify(original)))).toEqual(original)
})
