import type { Overrides, Service } from '../types'
import { read, write } from './storage'

const KEY = 'overrides'

export function loadOverrides(): Overrides {
  return read<Overrides>(KEY, {})
}

export function saveOverrides(overrides: Overrides): void {
  write(KEY, overrides)
}

/**
 * Merge stored hours onto services. Must run before any time comparison —
 * the seed data is a July snapshot for an August trip, so a corrected `closes`
 * has to be in place before `isOpenAt` ever looks at it.
 *
 * `closed: true` drops the service entirely.
 */
export function applyOverrides(services: Service[], overrides: Overrides): Service[] {
  const out: Service[] = []
  for (const s of services) {
    const o = overrides[s.id]
    if (!o) {
      out.push(s)
      continue
    }
    if (o.closed) continue
    out.push({
      ...s,
      ...(o.opens !== undefined && { opens: o.opens }),
      ...(o.closes !== undefined && { closes: o.closes }),
      ...(o.closedDays !== undefined && { closedDays: o.closedDays }),
    })
  }
  return out
}
