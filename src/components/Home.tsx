import { useMemo, useState } from 'react'
import { candidates, type MoodId } from '../lib/candidates'
import { filterSummary } from '../lib/chips'
import { clockState, minutesOfDay } from '../lib/clock'
import { headline } from '../lib/display'
import { useNow, youngestOverride } from '../lib/now'
import { Chips } from './Chips'
import { Header } from './Header'
import { Recommendations } from './Recommendations'
import { TimeRail } from './TimeRail'

/** Toggle membership without caring about order. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function Home() {
  const { now, simulated } = useNow()
  const nowMinutes = minutesOfDay(now)
  const state = clockState(now)

  const [cravings, setCravings] = useState<string[]>([])
  const [moods, setMoods] = useState<MoodId[]>([])

  // Recomputed on the minute and whenever a chip changes — not on every 15s
  // tick, so the list identity is stable enough for the reroll page to survive.
  const list = useMemo(
    () =>
      candidates(now, {
        cravings,
        moods,
        youngestInParty: youngestOverride(window.location.search),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nowMinutes, cravings, moods],
  )

  const lead = headline(state, list)
  const hasFilters = cravings.length + moods.length > 0
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
    <main className="mx-auto min-h-dvh w-full max-w-md bg-ocean text-foam">
      <Header now={now} state={state} simulated={simulated} />
      <TimeRail now={now} />

      <Chips
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
          {/* Keyed on the state and the filters so rerolling resets when either
              turns over — but never on a clock tick, which would silently throw
              away the user's position once a minute. */}
          <Recommendations
            key={`${state}|${[...cravings].sort().join(',')}|${[...moods].sort().join(',')}`}
            list={list}
            nowMinutes={nowMinutes}
            showAlsoOpen={state === 'gap' && !hasFilters}
          />
        </div>
      )}
    </main>
  )
}
