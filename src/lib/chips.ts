import { CONFIG } from '../config'
import { activeServices } from '../data'
import type { Service } from '../types'
import { MOOD_LABELS, MOOD_PREDICATES, isOpenAt, type MoodId } from './candidates'
import { clockState, minutesOfDay } from './clock'

/**
 * Vocabulary terms that describe a service rather than name a want. Nobody
 * craves "grill" or "vegetarian" for dinner — those are how a thing is cooked
 * or who it suits, and `format`/`dressCode` already cover that ground. Every
 * other keyword is treated as a craving.
 *
 * A denylist rather than an allowlist, because the meal filter below already
 * does the narrowing: an allowlist would have to be re-curated by hand every
 * time the seed data gained a term.
 */
const NOT_CRAVINGS = new Set(['vegetarian', 'buffet', 'grill', 'fried', 'cheese', 'rice'])

/**
 * The services competing at time `t`, matching `candidates()` exactly: during
 * a real meal only that meal, during the gap whatever is open across all of
 * them, and always minus anything the party is too young for.
 *
 * The party filter matters more than it looks. `duck` and `lamb` are carried
 * by Le Petit Chateau alone, which is 12+; with `HAS_UNDER_12` on, offering
 * them puts a chip on screen that can only ever return nothing.
 */
function poolAt(t: Date, youngestInParty?: number): Service[] {
  const state = clockState(t)
  const now = minutesOfDay(t)
  const youngest = youngestInParty ?? (CONFIG.HAS_UNDER_12 ? 0 : 99)
  return activeServices.filter(
    (s) =>
      (state === 'gap' ? isOpenAt(s, now) : s.meal === state) &&
      !(s.minAge !== null && s.minAge > youngest),
  )
}

/**
 * Cravings available at this meal, ordered by how many services carry each.
 *
 * Scoped to the meal because the seed keywords already are: breakfast carries
 * eggs, pastry and pancakes and no pizza; only Soy carries sushi and only at
 * dinner. A global row spends most of its width on things that cannot be
 * served for hours.
 *
 * Deliberately uncapped. A cap ordered by frequency would drop exactly the
 * keywords worth tapping — sushi and teppanyaki carry one dinner service each
 * and would rank last — which would leave Soy and Kimonos unreachable from
 * the chip row at any hour. The row is a scrolling control surface, not a
 * results list; the three-result rule does not apply to it.
 */
export function cravingChipsAt(t: Date, youngestInParty?: number): string[] {
  const counts = new Map<string, number>()
  for (const service of poolAt(t, youngestInParty)) {
    for (const keyword of service.keywords) {
      if (NOT_CRAVINGS.has(keyword)) continue
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1)
    }
  }
  return [...counts.keys()].sort(
    (a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b),
  )
}

/**
 * "Surprise us" is deliberately absent. The spec defines it as "no filter,
 * random from valid set", but step 4 already removed the randomness — a random
 * pick would change the list between renders, which the spec forbids. What
 * remains is "show me a different three from the valid set", which is exactly
 * what the reroll button does.
 */
const ALL_MOODS: MoodId[] = ['quick', 'sand', 'nice', 'indoors', 'feral']

/**
 * Moods are predicates over service fields, so they go stale by meal too:
 * every `dressCode: "evening"` service is a dinner service, which makes
 * "Somewhere nice" a guaranteed dead end at breakfast.
 */
export function moodChipsAt(t: Date, youngestInParty?: number): MoodId[] {
  const pool = poolAt(t, youngestInParty)
  return ALL_MOODS.filter((mood) => pool.some(MOOD_PREDICATES[mood]))
}

/** "sushi + Quick and easy" — for the empty state, so it names what to undo. */
export function filterSummary(cravings: string[], moods: MoodId[]): string {
  return [...cravings, ...moods.map((m) => MOOD_LABELS[m])].join(' + ')
}
