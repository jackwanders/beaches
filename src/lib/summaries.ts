import summaries from '../../data/summaries.json'

/**
 * A one-line description of what a service actually serves — "Neapolitan pizza
 * & sandwiches" rather than "Prosciutto pizza".
 *
 * Kept out of `services.json` on purpose. That file is seed data, treated as
 * given; these lines are generated from the mirrored menu PDFs plus research,
 * so keeping them separate keeps generated content distinguishable from
 * curated content and makes a regeneration a one-file change.
 *
 * Falls back to the first signature dish where no summary exists, so the card
 * never loses its bottom line.
 */
const byId = summaries as Record<string, string>

export function summaryFor(serviceId: string, signatureDishes: string[]): string | undefined {
  return byId[serviceId] ?? signatureDishes[0]
}

/** True when the line is a generated summary rather than a fallback dish name. */
export function hasSummary(serviceId: string): boolean {
  return byId[serviceId] !== undefined
}
