import { CONFIG } from '../config'
import { activeServices, keywordVocabulary } from '../data'
import type { Overrides, Service } from '../types'
import { isOpenAt, rank } from './candidates'
import { MINUTES_PER_DAY, minutesOfDay } from './clock'
import { applyOverrides } from './overrides'

export type SearchHit = {
  service: Service
  /** Set when the service is not open at the search time. */
  opensAt?: number
  matchedDishes: string[]
}

/**
 * Autosuggest over the ~40-term controlled vocabulary, deliberately not over
 * extracted menu text. Nobody types "Grilled Mahi Mahi with Scotch Bonnet
 * Beurre Blanc"; forty curated terms give instant, predictable suggestions.
 *
 * An empty query returns the whole vocabulary, which doubles as the answer to
 * "what can I even search for here?".
 */
export function suggest(query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...keywordVocabulary]
  return keywordVocabulary
    .filter((term) => term.includes(q))
    .sort(
      (a, b) => Number(b.startsWith(q)) - Number(a.startsWith(q)) || a.localeCompare(b),
    )
}

function minutesUntilOpen(s: Service, now: number): number {
  if (isOpenAt(s, now)) return 0
  if (s.opens === null) return 0
  return (s.opens - now + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

/**
 * Every service carrying the keyword, across every meal. This is a browse
 * surface — the three-result rule applies only to the home screen — so
 * open-now is a *sort*, not a filter: closed matches follow, soonest first,
 * each carrying the time it next opens.
 */
export function search(
  keyword: string,
  t: Date,
  opts: { overrides?: Overrides; youngestInParty?: number } = {},
): SearchHit[] {
  const now = minutesOfDay(t)
  const youngest = opts.youngestInParty ?? (CONFIG.HAS_UNDER_12 ? 0 : 99)
  const k = keyword.trim().toLowerCase()
  if (!k) return []

  return applyOverrides(activeServices, opts.overrides ?? {})
    .filter((s) => s.keywords.includes(k))
    .filter((s) => !(s.minAge !== null && s.minAge > youngest))
    .map((service) => ({
      service,
      until: minutesUntilOpen(service, now),
      // "which signature dishes matched, where known" — most services carry
      // none that name the keyword, and those simply show no dish line.
      matchedDishes: service.signatureDishes.filter((d) => d.toLowerCase().includes(k)),
    }))
    .sort(
      (a, b) =>
        Number(a.until > 0) - Number(b.until > 0) ||
        a.until - b.until ||
        rank(a.service, b.service),
    )
    .map(({ service, until, matchedDishes }) => ({
      service,
      opensAt: until === 0 ? undefined : service.opens!,
      matchedDishes,
    }))
}
