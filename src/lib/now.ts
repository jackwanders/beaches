import { useEffect, useState } from 'react'

/** `?t=16:00` — freeze the app at a given clock time. */
export function parseTimeParam(search: string): { hours: number; minutes: number } | null {
  const raw = new URLSearchParams(search).get('t')
  if (!raw) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

/** Milliseconds to add to the real clock to land on the simulated time today. */
export function simulatedOffsetMs(search: string, real: Date): number {
  const parsed = parseTimeParam(search)
  if (!parsed) return 0
  const target = new Date(real)
  target.setHours(parsed.hours, parsed.minutes, 0, 0)
  return target.getTime() - real.getTime()
}

/**
 * `?u12=0` drops the under-12 filter, so the three 12+ dinner services can be
 * seen before the settings toggle exists (step 10). Returns the value
 * `candidates()` wants for `youngestInParty`.
 */
export function youngestOverride(search: string): number | undefined {
  return new URLSearchParams(search).get('u12') === '0' ? 99 : undefined
}

const search = typeof window === 'undefined' ? '' : window.location.search

/**
 * Ticks every 15s so the rail marker slides and closing-soon flips live. The
 * simulated clock still ticks — load `?t=16:58` and watch it cross into dinner.
 */
export function useNow(): { now: Date; simulated: boolean } {
  const [offset] = useState(() => simulatedOffsetMs(search, new Date()))
  const [simulated] = useState(() => parseTimeParam(search) !== null)
  const [now, setNow] = useState(() => new Date(Date.now() + offset))

  useEffect(() => {
    const tick = () => setNow(new Date(Date.now() + offset))
    const id = setInterval(tick, 15_000)
    // iOS throttles a backgrounded PWA's timers hard. Without this you unlock
    // your phone to a stale clock — which is exactly when the app gets used.
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [offset])

  return { now, simulated }
}
