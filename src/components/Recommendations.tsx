import type { Candidate } from '../lib/candidates'
import type { Service } from '../types'
import { VenueCard } from './VenueCard'

/**
 * Every candidate, ranked best first, scrolled.
 *
 * This replaced a three-card window with a "Show me others" reroll. The spec
 * argued three-plus-a-reroll is a decision and nine is homework; in practice
 * the button was a worse way to see the fourth option than a thumb.
 */
export function Recommendations({
  list,
  nowMinutes,
  onSelect,
}: {
  list: Candidate[]
  nowMinutes: number
  onSelect: (service: Service) => void
}) {
  return (
    <div className="flex flex-col gap-3 px-4 pb-10">
      {list.map((candidate) => (
        <VenueCard
          key={candidate.service.id}
          candidate={candidate}
          nowMinutes={nowMinutes}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
