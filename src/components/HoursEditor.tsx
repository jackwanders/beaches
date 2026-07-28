import { fromTimeInput, toTimeInput } from '../lib/overrides'
import type { Overrides, Service } from '../types'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const FIELD =
  'rounded-lg border border-foam/15 bg-ocean px-2 py-1.5 text-sm tabular-nums text-foam focus:border-turquoise/60 focus:outline-none'

/**
 * The seed data is a July snapshot for an August trip, and the resort hands
 * out a printed board at check-in. This is how a correction gets made from a
 * phone at the buffet rather than from a laptop at home.
 */
export function HoursEditor({
  service,
  override,
  onChange,
  onReset,
}: {
  service: Service
  override: Overrides[string] | undefined
  onChange: (patch: Overrides[string]) => void
  onReset: () => void
}) {
  const opens = override?.opens ?? service.opens
  const closes = override?.closes ?? service.closes
  const closedDays = override?.closedDays ?? service.closedDays ?? []
  const closed = override?.closed === true

  const toggleDay = (day: number) =>
    onChange({
      closedDays: closedDays.includes(day)
        ? closedDays.filter((d) => d !== day)
        : [...closedDays, day].sort(),
    })

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-foam/15 p-3">
      <div className="flex items-center gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-[11px] tracking-wide text-sand/60">OPENS</span>
          <input
            type="time"
            value={toTimeInput(opens)}
            disabled={closed}
            onChange={(e) => onChange({ opens: fromTimeInput(e.target.value) ?? undefined })}
            className={`${FIELD} w-full disabled:opacity-40`}
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[11px] tracking-wide text-sand/60">CLOSES</span>
          <input
            type="time"
            value={toTimeInput(closes)}
            disabled={closed}
            onChange={(e) => onChange({ closes: fromTimeInput(e.target.value) ?? undefined })}
            className={`${FIELD} w-full disabled:opacity-40`}
          />
        </label>
      </div>

      <div>
        <span className="mb-1.5 block text-[11px] tracking-wide text-sand/60">
          CLOSED ON — from the check-in sheet
        </span>
        <div className="flex gap-1">
          {DAYS.map((letter, day) => {
            const off = closedDays.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={off}
                aria-label={DAY_NAMES[day]}
                disabled={closed}
                onClick={() => toggleDay(day)}
                className={`size-8 rounded-full border text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise disabled:opacity-40 ${
                  off
                    ? 'border-signal bg-signal font-semibold text-ocean'
                    : 'border-foam/15 text-sand'
                }`}
              >
                {letter}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-pressed={closed}
          onClick={() => onChange({ closed: !closed })}
          className={`rounded-full border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise ${
            closed ? 'border-signal bg-signal font-semibold text-ocean' : 'border-foam/15 text-sand'
          }`}
        >
          Not serving
        </button>
        {override && (
          <button
            type="button"
            onClick={onReset}
            className="text-sm text-sand/60 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
          >
            Reset to published
          </button>
        )}
      </div>
    </div>
  )
}
