import { useMemo, useRef, useState } from 'react'
import { candidates, type MoodId } from '../lib/candidates'
import { cravingChipsAt, filterSummary, moodChipsAt } from '../lib/chips'
import { clockState } from '../lib/clock'
import { headline } from '../lib/display'
import { youngestOverride } from '../lib/now'
import type { Overrides, Service } from '../types'
import { Chips } from './Chips'
import { Recommendations } from './Recommendations'
import { TimeRail } from './TimeRail'

/** Toggle membership without caring about order. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/** The "Now" mode: rail, chips, three cards, reroll. */
export function Home({
  now,
  nowMinutes,
  overrides,
  onSelect,
}: {
  now: Date
  nowMinutes: number
  overrides: Overrides
  onSelect: (service: Service) => void
}) {
  const state = clockState(now)

  const [cravings, setCravings] = useState<string[]>([])
  const [moods, setMoods] = useState<MoodId[]>([])

  // Chips are scoped to the meal, so both rows change as the day turns over.
  // Gap is clock-dependent (open-now across every meal), hence nowMinutes.
  const youngest = youngestOverride(window.location.search)
  const chipKey = state === 'gap' ? `gap:${nowMinutes}` : state
  const cravingOptions = useMemo(() => cravingChipsAt(now, youngest), [chipKey])
  const moodOptions = useMemo(() => moodChipsAt(now, youngest), [chipKey])

  // A craving selected at lunch may not exist at dinner. Drop the selection
  // when the meal turns over rather than filtering on a keyword the user can
  // no longer see or unset. Moods survive — they are meal-agnostic predicates.
  const lastState = useRef(state)
  if (lastState.current !== state) {
    lastState.current = state
    if (cravings.length) setCravings([])
  }

  // Recomputed on the minute and whenever a chip changes — not on every 15s
  // tick, so the list identity is stable enough for the reroll page to survive.
  const list = useMemo(
    () => candidates(now, { cravings, moods, youngestInParty: youngest, overrides }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nowMinutes, cravings, moods, overrides],
  )

  const lead = headline(state, list)
  const clear = () => {
    setCravings([])
    setMoods([])
  }

  // Cravings are OR'd and moods are AND'd, so a narrow pair can legitimately
  // match nothing at any hour — "sushi" plus "quick and easy" has no answer on
  // the property. candidates() is right to return empty; the screen has to say
  // so and name the way out.
  const deadEnd = list.length === 0

  return (
    <>
      <TimeRail now={now} />

      <Chips
        cravingOptions={cravingOptions}
        moodOptions={moodOptions}
        cravings={cravings}
        moods={moods}
        onCraving={(k) => setCravings((c) => toggle(c, k))}
        onMood={(m) => setMoods((c) => toggle(c, m))}
        onClear={clear}
      />

      {lead && !deadEnd && <p className="px-4 pt-4 text-[15px] leading-snug text-sand">{lead}</p>}

      {deadEnd ? (
        <div className="px-4 pt-6">
          <p className="text-[15px] leading-snug text-sand">
            Nothing on the property matches {filterSummary(cravings, moods)} — not now, not later
            today.
          </p>
          <button
            type="button"
            onClick={clear}
            className="mt-4 w-full rounded-xl border border-turquoise/50 py-3 text-sm font-semibold text-turquoise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise active:bg-turquoise/10"
          >
            Start over
          </button>
        </div>
      ) : (
        <div className="pt-4">
          <Recommendations list={list} nowMinutes={nowMinutes} onSelect={onSelect} />
        </div>
      )}
    </>
  )
}
