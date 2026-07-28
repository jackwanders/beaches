import { activeServices } from '../data'
import { MOOD_LABELS, type MoodId } from './candidates'

/**
 * The twelve cravings the spec names, ordered by how many services carry each.
 *
 * The *set* is curated rather than the whole 39-term vocabulary, because raw
 * frequency ranks attributes above cravings: the top of the list is
 * vegetarian (17), fish (16), dessert (15), pastry (12), buffet (10), grill
 * (10). Nobody wants "grill" for dinner. Worse, a literal frequency order
 * would push sushi and jerk — one service each — off the row entirely, and
 * both are named in the acceptance checks ("tapping sushi at 09:00 offers Soy
 * at 17:30"). The full vocabulary still backs step 8's search autosuggest.
 *
 * `seafood` from the spec's list has no vocabulary term; `fish` is the closest
 * single keyword and the most-carried of the seafood group.
 */
const CURATED = [
  'fish',
  'dessert',
  'salad',
  'steak',
  'pizza',
  'taco',
  'pasta',
  'burger',
  'ice cream',
  'coffee',
  'sushi',
  'jerk',
]

function keywordCounts(): Map<string, number> {
  const counts = new Map<string, number>()
  for (const service of activeServices) {
    for (const keyword of service.keywords) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1)
    }
  }
  return counts
}

export const CRAVING_CHIPS: string[] = (() => {
  const counts = keywordCounts()
  return CURATED.filter((k) => counts.has(k)).sort(
    (a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b),
  )
})()

/**
 * "Surprise us" is deliberately absent. The spec defines it as "no filter,
 * random from valid set", but step 4 already removed the randomness — a random
 * pick would change the list between renders, which the spec forbids. What
 * remains is "show me a different three from the valid set", which is exactly
 * what the reroll button does. A chip that duplicates the button below it is
 * one more decision for no gain.
 */
export const MOOD_CHIPS: MoodId[] = ['quick', 'sand', 'nice', 'indoors', 'feral']

/** "sushi + Quick and easy" — for the empty state, so it names what to undo. */
export function filterSummary(cravings: string[], moods: MoodId[]): string {
  return [...cravings, ...moods.map((m) => MOOD_LABELS[m])].join(' + ')
}
