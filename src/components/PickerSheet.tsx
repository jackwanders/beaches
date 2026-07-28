import { useEffect, useRef } from 'react'
import type { Option } from '../lib/explore'

/**
 * A bottom sheet of mutually exclusive options, same native `<dialog>` as the
 * venue sheet so it inherits the focus trap, Escape-to-close and backdrop.
 */
export function PickerSheet({
  open,
  title,
  options,
  selected,
  onPick,
  onClose,
}: {
  open: boolean
  title: string
  options: Option[]
  selected: string | null
  onPick: (id: string | null) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-ocean p-0 text-foam backdrop:bg-black/70 open:flex sm:mx-auto"
    >
      <h2 className="condensed shrink-0 px-4 pt-5 pb-3 font-display text-xl font-semibold tracking-tight text-foam">
        {title}
      </h2>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
        <ul className="flex flex-col gap-1">
          {options.map((option) => {
            const isSelected = option.id === selected
            // A zero count is offered but visibly dead, so the combination
            // that returns nothing is obvious before you tap it.
            const empty = option.count === 0
            return (
              <li key={option.id ?? 'all'}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    onPick(option.id)
                    onClose()
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise ${
                    isSelected
                      ? 'border-turquoise bg-turquoise/10 font-semibold text-foam'
                      : 'border-foam/10 text-sand active:bg-foam/5'
                  } ${empty && !isSelected ? 'opacity-40' : ''}`}
                >
                  <span className="truncate">{option.label}</span>
                  <span className="shrink-0 text-sm tabular-nums text-sand/60">
                    {option.count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </dialog>
  )
}
