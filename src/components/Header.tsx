import { formatTime, minutesOfDay } from '../lib/clock'
import { MEAL_LABELS } from '../lib/display'
import type { ClockState } from '../types'

export function Header({
  now,
  state,
  simulated,
}: {
  now: Date
  state: ClockState
  simulated: boolean
}) {
  return (
    <header className="flex items-baseline justify-between gap-3 px-4 pt-5 pb-3">
      <h1 className="condensed font-display text-3xl font-semibold tracking-tight text-foam">
        {MEAL_LABELS[state]}
      </h1>
      <div className="flex items-center gap-2">
        {simulated && (
          <span className="rounded border border-signal/60 px-1.5 py-0.5 text-[10px] font-semibold text-signal">
            SIM
          </span>
        )}
        <time className="text-lg tabular-nums text-sand">{formatTime(minutesOfDay(now))}</time>
      </div>
    </header>
  )
}
