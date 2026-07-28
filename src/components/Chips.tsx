import { MOOD_LABELS, type MoodId } from '../lib/candidates'

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise ${
        selected
          ? 'border-turquoise bg-turquoise font-semibold text-ocean'
          : 'border-foam/15 text-sand active:bg-foam/10'
      }`}
    >
      {label}
    </button>
  )
}

/* Bleeds to both screen edges so the row reads as scrollable, with the
   scrollbar hidden — it is a phone, the overflow is discoverable by dragging. */
const ROW = 'flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export function Chips({
  cravingOptions,
  moodOptions,
  cravings,
  moods,
  onCraving,
  onMood,
  onClear,
}: {
  cravingOptions: string[]
  moodOptions: MoodId[]
  cravings: string[]
  moods: MoodId[]
  onCraving: (keyword: string) => void
  onMood: (mood: MoodId) => void
  onClear: () => void
}) {
  const active = cravings.length + moods.length

  return (
    <div className="flex flex-col gap-2 pt-4">
      <div className={ROW} role="group" aria-label="Cravings">
        {cravingOptions.map((keyword) => (
          <Chip
            key={keyword}
            label={keyword}
            selected={cravings.includes(keyword)}
            onClick={() => onCraving(keyword)}
          />
        ))}
      </div>

      <div className={ROW} role="group" aria-label="Moods">
        {moodOptions.map((mood) => (
          <Chip
            key={mood}
            label={MOOD_LABELS[mood]}
            selected={moods.includes(mood)}
            onClick={() => onMood(mood)}
          />
        ))}
      </div>

      {active > 0 && (
        <div className="px-4">
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-sand/60 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
          >
            Clear {active === 1 ? 'filter' : `all ${active} filters`}
          </button>
        </div>
      )}
    </div>
  )
}
