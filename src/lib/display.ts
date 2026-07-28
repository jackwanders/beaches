import { CONFIG } from '../config'
import { villages } from '../data'
import type { ClockState, Meal, Service } from '../types'
import type { Candidate } from './candidates'
import { MEAL_WINDOWS, MINUTES_PER_DAY, formatTime } from './clock'

export const MEAL_LABELS: Record<ClockState, string> = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  // Not "the gap" — that's internal jargon. This is the most-read word on the
  // screen for 90 minutes a day.
  gap: 'BETWEEN MEALS',
  dinner: 'DINNER',
  snacks: 'SNACKS',
  lateNight: 'LATE NIGHT',
}

const villageNames = new Map(villages.map((v) => [v.id, v.name]))

/** "key-west" → "Key West". The card already sits under a resort heading. */
export function villageName(id: string): string {
  const name = villageNames.get(id)
  if (!name) return id
  return name.replace(/ Village$/, '')
}

export type StatusTone = 'open' | 'soon' | 'later' | 'unknown'
export type Status = { text: string; tone: StatusTone }

/**
 * The card's one-line answer to "can I walk there now?". `soon` is the only
 * thing that earns signal orange anywhere in the app.
 */
export function serviceStatus(candidate: Candidate, now: number): Status {
  const s = candidate.service

  // Set only when nothing matched and candidates() shifted forward in time.
  if (candidate.opensAt !== undefined) {
    return { text: `Opens at ${formatTime(candidate.opensAt)}`, tone: 'later' }
  }

  // Null hours mean unpublished, not closed — always open, badged.
  if (s.opens === null || s.closes === null) {
    return { text: 'Open · hours unconfirmed', tone: 'unknown' }
  }

  // Wraps for crossesMidnight: Cricketer's closes at 02:00, so at 01:30 it is
  // 30 minutes out, not −1410.
  const untilClose = (s.closes - now + MINUTES_PER_DAY) % MINUTES_PER_DAY
  if (untilClose <= CONFIG.CLOSING_SOON_MINUTES) {
    return { text: `Closes in ${untilClose} min`, tone: 'soon' }
  }

  return { text: `Open till ${formatTime(s.closes)}`, tone: 'open' }
}

const DINNER_START = MEAL_WINDOWS.find((w) => w.state === 'dinner')!.start

/**
 * A sentence above the cards, only when the cards alone would be confusing.
 * During a normal meal the header label says everything and a headline is
 * noise, so this returns null.
 */
export function headline(state: ClockState, list: Candidate[]): string | null {
  if (list.length > 0 && list.every((c) => c.opensAt !== undefined)) {
    return "Nothing's open right now. Coming up:"
  }
  if (state === 'gap') {
    return `Lunch is over. Dinner starts at ${formatTime(DINNER_START)}. Open right now:`
  }
  return null
}

/**
 * Day order for listing a venue's services. Not derived from `opens`, because
 * two services have null hours and would sort unpredictably.
 */
export const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'snacks', 'dinner', 'lateNight']

export function byMealOrder(a: Service, b: Service): number {
  return MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal)
}

/** "5:00 – 9:30 PM" for a service in its own right, outside any candidate. */
export function hoursText(s: Service): string {
  if (s.opens === null || s.closes === null) return 'Hours unconfirmed'
  return `${formatTime(s.opens)} – ${formatTime(s.closes)}`
}

/** Badges that are a property of the service, in the order they read best. */
export function badgesFor(s: Service): string[] {
  const badges: string[] = []
  if (s.reservation) badges.push('reservation')
  if (s.dressCode === 'evening') badges.push('evening attire')
  if (s.minAge !== null) badges.push(`${s.minAge}+`)
  if (s.opens === null) badges.push('hours unconfirmed')
  return badges
}
