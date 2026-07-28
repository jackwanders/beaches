import { CONFIG } from '../config'
import { activeServices, venueBySlug } from '../data'
import type { Meal, Overrides, Service } from '../types'
import { MINUTES_PER_DAY, clockState, minutesOfDay } from './clock'
import { applyOverrides } from './overrides'

export type MoodId =
  | 'quick'
  | 'sand'
  | 'nice'
  | 'indoors'
  | 'feral'
  | 'surprise'

/** Predicates over service fields, not a stored column. */
export const MOOD_PREDICATES: Record<MoodId, (s: Service) => boolean> = {
  quick: (s) => s.format === 'truck' || s.format === 'quickservice',
  sand: (s) => ['barefoot', 'schooners', 'neptunes', 'bayside', 'arizonas'].includes(s.venue),
  nice: (s) => s.dressCode === 'evening',
  indoors: (s) =>
    ['giuseppes', 'reflections', 'cricketers', 'kimonos', 'soy', 'marios', 'pinta'].includes(
      s.venue,
    ),
  feral: (s) =>
    s.format === 'truck' || s.format === 'quickservice' || s.venue === 'pinta' || s.venue === 'arizonas',
  // No filter. The day-seeded rotation supplies the variety; picking randomly
  // would change the list between renders.
  surprise: () => true,
}

export const MOOD_LABELS: Record<MoodId, string> = {
  quick: 'Quick and easy',
  sand: 'Toes in the sand',
  nice: 'Somewhere nice',
  indoors: 'Cool and indoors',
  feral: 'Kids are feral',
  surprise: 'Surprise us',
}

/** `opensAt` is set only when nothing matched now and we shifted forward in time. */
export type Candidate = { service: Service; opensAt?: number }

export type CandidateOptions = {
  meal?: Meal
  cravings?: string[]
  moods?: MoodId[]
  youngestInParty?: number
  overrides?: Overrides
}

/**
 * `opens === null` means hours are unpublished — always open, badged in the UI.
 * `crossesMidnight` is true only for cricketers-latenight (22:00–02:00).
 */
export function isOpenAt(s: Service, minutes: number): boolean {
  if (s.opens === null || s.closes === null) return true
  if (s.crossesMidnight) return minutes >= s.opens || minutes < s.closes
  return minutes >= s.opens && minutes < s.closes
}

/** Minutes until the service next opens; 0 if it is open now. */
function minutesUntilOpen(s: Service, minutes: number): number {
  if (isOpenAt(s, minutes)) return 0
  if (s.opens === null) return 0
  return (s.opens - minutes + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

function isClosedToday(s: Service, t: Date): boolean {
  return s.closedDays?.includes(t.getDay()) ?? false
}

/** Exported for search, which ranks its open-now group the same way. */
export function rank(a: Service, b: Service): number {
  const va = venueBySlug.get(a.venue)
  const vb = venueBySlug.get(b.venue)

  const dishes = Number(b.signatureDishes.length > 0) - Number(a.signatureDishes.length > 0)
  if (dishes) return dishes

  const verified = Number(b.confidence === 'verified') - Number(a.confidence === 'verified')
  if (verified) return verified

  // Google rating where present; unrated venues sort last rather than as zero.
  const rating = (vb?.rating ?? -1) - (va?.rating ?? -1)
  if (rating) return rating

  // Proximity with no GPS fix: the home village first, everything else after.
  // The property is ~600m end to end, so this is a tiebreak, not a sort.
  const home =
    Number(vb?.village === CONFIG.HOME_VILLAGE) - Number(va?.village === CONFIG.HOME_VILLAGE)
  if (home) return home

  return (va?.name ?? a.venue).localeCompare(vb?.name ?? b.venue)
}

/**
 * Rotate by day of month so the same three don't lead every morning. Seeded by
 * the date alone, so the list is stable within a day — it must not change
 * between renders.
 */
function rotateForDay<T>(list: T[], t: Date): T[] {
  if (list.length === 0) return list
  const by = t.getDate() % list.length
  return [...list.slice(by), ...list.slice(0, by)]
}

export function candidates(t: Date, opts: CandidateOptions = {}): Candidate[] {
  const now = minutesOfDay(t)
  const meal = opts.meal ?? clockState(t)
  const youngest = opts.youngestInParty ?? (CONFIG.HAS_UNDER_12 ? 0 : 99)

  // Overrides first — before any time comparison.
  const pool = applyOverrides(activeServices, opts.overrides ?? {}).filter(
    (s) => !isClosedToday(s, t),
  )

  // Filters that are true regardless of the clock.
  const matchesTasteAndParty = (s: Service) => {
    if (s.minAge !== null && s.minAge > youngest) return false
    if (opts.cravings?.length && !opts.cravings.some((k) => s.keywords.includes(k))) return false
    if (opts.moods?.length && !opts.moods.every((m) => MOOD_PREDICATES[m](s))) return false
    return true
  }

  const eligible = pool.filter(matchesTasteAndParty)

  // During a real meal only that meal competes: at lunch, open snack bars do not
  // pad the list. During the gap it's open-now across every meal — that is the
  // whole point of the gap state.
  const openNow = eligible.filter(
    (s) => (meal === 'gap' || s.meal === meal) && isOpenAt(s, now),
  )

  if (openNow.length > 0) {
    return rotateForDay(openNow.sort(rank), t).map((service) => ({ service }))
  }

  // Never return zero: shift forward in time rather than hiding the craving.
  //
  // An *inferred* meal is only a proxy for "now", so the forward search drops it
  // — "sushi at 9am" is answered by "Soy opens at 5:30", not by silence. An
  // *explicit* meal is user intent ("where should we eat dinner tonight?") and
  // is kept, unless keeping it would leave nothing at all.
  const byMeal = opts.meal ? eligible.filter((s) => s.meal === opts.meal) : eligible
  return forwardSearch(byMeal.length > 0 ? byMeal : eligible, now)
}

function forwardSearch(pool: Service[], now: number): Candidate[] {
  return pool
    .map((service) => ({ service, until: minutesUntilOpen(service, now) }))
    .sort((a, b) => a.until - b.until || rank(a.service, b.service))
    .map(({ service, until }) => (until === 0 ? { service } : { service, opensAt: service.opens! }))
}

/**
 * Three per page, wrapping to the start. Advances the window; never reshuffles —
 * a user who rerolls past something wants to be able to get back to it. Fewer
 * than three candidates renders as fewer than three: no padding, no relaxing
 * the minAge filter.
 */
export function rerollWindow<T>(list: T[], page: number): T[] {
  const size = CONFIG.RESULTS
  if (list.length <= size) return list
  const start = (((page * size) % list.length) + list.length) % list.length
  return Array.from({ length: size }, (_, i) => list[(start + i) % list.length])
}
