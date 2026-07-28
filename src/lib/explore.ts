import { services, venueBySlug, villages } from '../data'
import type { Service } from '../types'
import { MEAL_LABELS, MEAL_ORDER } from './display'

export type GroupBy = 'village' | 'meal'
export type Group = { key: string; label: string; services: Service[] }

/**
 * Explore is the catalogue, so it deliberately breaks the filters every other
 * surface applies: Mario's shows up despite `operational: false` — this is the
 * only screen where it is reachable at all — and the 12+ services show up
 * regardless of `HAS_UNDER_12`, carrying their badge. Hiding a restaurant from
 * someone reading about the resort in July helps nobody; hiding it from a
 * recommendation at 7pm is the whole point of the other surfaces.
 */
export function exploreGroups(
  groupBy: GroupBy,
  opts: { starredOnly?: boolean; favorites?: string[] } = {},
): Group[] {
  const pool =
    opts.starredOnly ? services.filter((s) => opts.favorites?.includes(s.id)) : services

  const byVenueThenMeal = (a: Service, b: Service) => {
    const an = venueBySlug.get(a.venue)?.name ?? a.venue
    const bn = venueBySlug.get(b.venue)?.name ?? b.venue
    return an.localeCompare(bn) || MEAL_ORDER.indexOf(a.meal) - MEAL_ORDER.indexOf(b.meal)
  }

  const groups: Group[] =
    groupBy === 'village'
      ? villages.map((v) => ({
          key: v.id,
          label: v.name,
          services: pool
            .filter((s) => venueBySlug.get(s.venue)?.village === v.id)
            .sort(byVenueThenMeal),
        }))
      : MEAL_ORDER.map((meal) => ({
          key: meal,
          label: MEAL_LABELS[meal],
          services: pool.filter((s) => s.meal === meal).sort(byVenueThenMeal),
        }))

  // Seaside Village carries no venues at all, and a starred filter empties most
  // groups. An empty heading is noise either way.
  return groups.filter((g) => g.services.length > 0)
}
