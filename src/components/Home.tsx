import { useMemo } from 'react'
import { candidates } from '../lib/candidates'
import { clockState, minutesOfDay } from '../lib/clock'
import { headline } from '../lib/display'
import { useNow, youngestOverride } from '../lib/now'
import { Header } from './Header'
import { Recommendations } from './Recommendations'
import { TimeRail } from './TimeRail'

export function Home() {
  const { now, simulated } = useNow()
  const nowMinutes = minutesOfDay(now)
  const state = clockState(now)

  // Recomputed on the minute, not on every 15s tick, so the list identity is
  // stable enough for the reroll page below to survive a render.
  const list = useMemo(
    () => candidates(now, { youngestInParty: youngestOverride(window.location.search) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nowMinutes],
  )

  const lead = headline(state, list)

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-ocean text-foam">
      <Header now={now} state={state} simulated={simulated} />
      <TimeRail now={now} />

      {/* Step 6's craving and mood chip rows land here. */}

      {lead && <p className="px-4 pt-4 text-[15px] leading-snug text-sand">{lead}</p>}

      <div className="pt-4">
        {/* Keyed on the clock state so rerolling resets when the meal turns
            over — but never on a clock tick, which would silently throw away
            the user's position once a minute. */}
        <Recommendations
          key={state}
          list={list}
          nowMinutes={nowMinutes}
          showAlsoOpen={state === 'gap'}
        />
      </div>
    </main>
  )
}
