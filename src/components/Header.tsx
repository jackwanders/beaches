import { formatTime, minutesOfDay } from '../lib/clock'
import { MEAL_LABELS } from '../lib/display'
import type { Mode } from '../lib/trip'
import type { ClockState } from '../types'

const MODES: { id: Mode; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'explore', label: 'Explore' },
]

export function Header({
  now,
  state,
  mode,
  simulated,
  onMode,
  onSearch,
  onSettings,
}: {
  now: Date
  state: ClockState
  mode: Mode
  simulated: boolean
  onMode: (mode: Mode) => void
  onSearch: () => void
  onSettings: () => void
}) {
  return (
    <header className="px-4 pt-5 pb-3">
      <div className="flex items-baseline justify-between gap-3">
        {/* text-2xl, not 3xl: "BETWEEN MEALS" is the longest label and at 3xl
            it truncates on a 375px phone now that the clock and two icons
            share this row. Still larger than the venue names on the cards. */}
        <h1 className="condensed truncate font-display text-2xl font-semibold tracking-tight text-foam">
          {mode === 'explore' ? 'EXPLORE' : MEAL_LABELS[state]}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
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
              <path
                d="m16 16 4.5 4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onSettings}
            aria-label="Stars and notes"
            className="-mr-2 grid size-9 place-items-center rounded-full text-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise active:bg-foam/10"
          >
            <span className="text-lg leading-none">★</span>
          </button>
        </div>
      </div>

      {/* A segmented control rather than a bottom tab bar: mode switching is a
          once-per-trip-phase action, and the Now screen has no vertical slack
          to spare in the gap state. */}
      <div
        role="group"
        aria-label="Mode"
        className="mt-3 flex rounded-full border border-foam/15 p-0.5"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => onMode(m.id)}
            className={`flex-1 rounded-full py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise ${
              mode === m.id ? 'bg-foam/15 font-semibold text-foam' : 'text-sand'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </header>
  )
}
