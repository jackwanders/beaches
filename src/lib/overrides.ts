import { useCallback, useEffect, useState } from 'react'
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

/**
 * A single service with its override merged in, for the surfaces that display
 * a service rather than filter a list. `applyOverrides` drops closed services
 * because a recommendation must not name them; Explore and the detail sheet
 * still show them, marked, so you can see and undo what you changed.
 */
export function withOverride(service: Service, overrides: Overrides): Service {
  const o = overrides[service.id]
  if (!o) return service
  return {
    ...service,
    ...(o.opens !== undefined && { opens: o.opens }),
    ...(o.closes !== undefined && { closes: o.closes }),
    ...(o.closedDays !== undefined && { closedDays: o.closedDays }),
  }
}

export function isOverridden(id: string, overrides: Overrides): boolean {
  return overrides[id] !== undefined
}

export function isClosedByOverride(id: string, overrides: Overrides): boolean {
  return overrides[id]?.closed === true
}

/** 690 → "11:30", for `<input type="time">`. Null hours have no value. */
export function toTimeInput(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return ''
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** "11:30" → 690. An empty or malformed field means "leave it unset". */
export function fromTimeInput(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** An override holding nothing is not an override — drop the key entirely. */
function prune(overrides: Overrides): Overrides {
  const out: Overrides = {}
  for (const [id, o] of Object.entries(overrides)) {
    const kept = {
      ...(o.opens !== undefined && { opens: o.opens }),
      ...(o.closes !== undefined && { closes: o.closes }),
      ...(o.closedDays?.length && { closedDays: o.closedDays }),
      ...(o.closed && { closed: true as const }),
    }
    if (Object.keys(kept).length > 0) out[id] = kept
  }
  return out
}

export function useOverrides() {
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides)

  useEffect(() => {
    saveOverrides(overrides)
  }, [overrides])

  const setOverride = useCallback((id: string, patch: Overrides[string]) => {
    setOverrides((current) => prune({ ...current, [id]: { ...current[id], ...patch } }))
  }, [])

  const clearOverride = useCallback((id: string) => {
    setOverrides((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])

  const clearAll = useCallback(() => setOverrides({}), [])

  return { overrides, setOverride, clearOverride, clearAll }
}
