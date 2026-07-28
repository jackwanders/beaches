import { formatTime } from '../lib/clock'
import { MEAL_LABELS } from '../lib/display'
import { railGeometry } from '../lib/rail'
import type { ClockState } from '../types'

/** Written as literal class strings so Tailwind can see them. */
const SEGMENT_COLORS: Record<ClockState, { track: string; fill: string; text: string }> = {
  breakfast: { track: 'bg-breakfast/45', fill: 'bg-breakfast', text: 'text-breakfast' },
  lunch: { track: 'bg-lunch/45', fill: 'bg-lunch', text: 'text-lunch' },
  gap: { track: 'bg-gap/45', fill: 'bg-gap', text: 'text-gap' },
  dinner: { track: 'bg-dinner/45', fill: 'bg-dinner', text: 'text-dinner' },
  lateNight: { track: 'bg-latenight/45', fill: 'bg-latenight', text: 'text-latenight' },
  snacks: { track: 'bg-sand/45', fill: 'bg-sand', text: 'text-sand' },
}

/**
 * The signature element: the day's meal windows at true proportion, with a
 * live marker. Everything in this app is a function of the clock, and this is
 * where that shows — including the 15:30 lunch cliff and the narrow gap, both
 * visible before they bite.
 */
export function TimeRail({ now }: { now: Date }) {
  const { segments, markerPercent, activeIndex, clamped } = railGeometry(now)
  const active = segments[activeIndex]

  return (
    <div className="px-4">
      <div
        role="img"
        aria-label={`${MEAL_LABELS[active.state]}, ${formatTime(
          now.getHours() * 60 + now.getMinutes(),
        )}. Runs ${formatTime(active.start)} to ${formatTime(active.end)}.`}
        className="relative h-5"
      >
        {segments.map((s, i) => {
          // One pill, divided — not five chips. Only the outer ends round, and
          // the dividers are the ground colour showing through, so the bar
          // reads as a single object cut into meals.
          const ends =
            i === 0 ? 'rounded-l-full' : i === segments.length - 1 ? 'rounded-r-full' : ''
          // border-box, so the divider eats into the segment rather than
          // displacing it — the geometry still sums to 100%.
          const divider = i === segments.length - 1 ? '' : 'border-r-[3px] border-ocean'

          // The gap is a band like any other — it just has no hue. It fills as
          // it elapses too, so "the gap is nearly over" is readable.
          return (
            <div
              key={s.state}
              aria-hidden
              className={`absolute inset-y-0 overflow-hidden ${SEGMENT_COLORS[s.state].track} ${ends} ${divider}`}
              style={{ left: `${s.leftPercent}%`, width: `${s.widthPercent}%` }}
            >
              <div
                className={`h-full ${SEGMENT_COLORS[s.state].fill}`}
                style={{ width: `${s.fill * 100}%` }}
              />
            </div>
          )
        })}

        <div
          aria-hidden
          className={`absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-foam transition-[left] duration-500 ease-linear ${
            clamped ? 'opacity-40' : ''
          }`}
          style={{ left: `${markerPercent}%` }}
        />
      </div>

      {/* No per-segment labels — the gap is 7.5% of the bar, ~31px on a phone.
          One caption names the window that matters, in that window's own
          colour, which is what teaches the colours in the first place. */}
      <p className="mt-2 text-[12px] tabular-nums text-sand/70">
        <span className={`font-semibold ${SEGMENT_COLORS[active.state].text}`}>
          {MEAL_LABELS[active.state]}
        </span>{' '}
        · {formatTime(active.start)} – {formatTime(active.end)}
      </p>
    </div>
  )
}
