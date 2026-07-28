import { formatTime, minutesOfDay } from '../lib/clock'
import { MEAL_LABELS } from '../lib/display'
import type { ClockState } from '../types'

export function Header({
  now,
  state,
  simulated,
  onSearch,
}: {
  now: Date
  state: ClockState
  simulated: boolean
  onSearch: () => void
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
        <button
          type="button"
          onClick={onSearch}
          aria-label="Search"
          className="-mr-1 grid size-9 place-items-center rounded-full text-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise active:bg-foam/10"
        >
          {/* Inline rather than an icon package — nothing loads at runtime. */}
          <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}
