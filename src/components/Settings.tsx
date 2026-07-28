import { useEffect, useRef, useState } from 'react'
import type { Backup } from '../lib/favorites'

export function Settings({
  open,
  backup,
  onImport,
  onClose,
}: {
  open: boolean
  backup: Backup
  onImport: (raw: string) => Backup
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [paste, setPaste] = useState('')
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) {
      setPaste('')
      setMessage(null)
    }
  }, [open])

  const json = JSON.stringify(backup, null, 2)
  const starCount = backup.favorites.length
  const noteCount = Object.keys(backup.notes).length

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setMessage({ tone: 'ok', text: 'Copied. Paste it somewhere you trust.' })
    } catch {
      // Clipboard access needs a secure context and can be refused outright.
      setMessage({ tone: 'bad', text: 'Could not copy — select the text below instead.' })
    }
  }

  const applyImport = () => {
    try {
      const incoming = onImport(paste)
      const stars = incoming.favorites.length
      const notes = Object.keys(incoming.notes).length
      const parts = [
        stars > 0 && `${stars} ${stars === 1 ? 'star' : 'stars'}`,
        notes > 0 && `${notes} ${notes === 1 ? 'note' : 'notes'}`,
      ].filter(Boolean)
      setMessage({ tone: 'ok', text: `Merged ${parts.join(' and ')}.` })
      setPaste('')
    } catch (err) {
      setMessage({ tone: 'bad', text: (err as Error).message })
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-md flex-col bg-ocean p-0 text-foam backdrop:bg-black/70 open:flex sm:mx-auto"
    >
      <div className="flex shrink-0 items-baseline justify-between gap-3 px-4 pt-5 pb-3">
        <h2 className="condensed font-display text-2xl font-semibold tracking-tight text-foam">
          STARS &amp; NOTES
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-sand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise"
        >
          Done
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-8">
        <p className="text-sm leading-snug text-sand/80">
          {starCount} {starCount === 1 ? 'star' : 'stars'} and {noteCount}{' '}
          {noteCount === 1 ? 'note' : 'notes'}, kept on this device only. Two phones, two
          separate lists — that is deliberate.
        </p>

        <section className="space-y-2">
          <h3 className="text-[13px] font-semibold tracking-wide text-sand">BACK UP</h3>
          <p className="text-[13px] leading-snug text-sand/70">
            Safari clears this after a week without a visit. Copy it somewhere before the trip.
          </p>
          <button
            type="button"
            onClick={copy}
            disabled={starCount === 0 && noteCount === 0}
            className="w-full rounded-xl border border-turquoise/50 py-3 text-sm font-semibold text-turquoise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise active:bg-turquoise/10 disabled:border-foam/15 disabled:text-sand/40"
          >
            Copy stars &amp; notes
          </button>
          <textarea
            readOnly
            value={json}
            aria-label="Exported data"
            rows={4}
            className="w-full rounded-lg border border-foam/15 bg-surface px-2.5 py-2 font-mono text-[11px] text-sand/70 focus:outline-none"
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-[13px] font-semibold tracking-wide text-sand">RESTORE</h3>
          <p className="text-[13px] leading-snug text-sand/70">
            Paste a backup here. It merges with what is already on this device — nothing is
            replaced.
          </p>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder='{"favorites":[…],"notes":{…}}'
            aria-label="Paste a backup"
            rows={4}
            className="w-full rounded-lg border border-foam/15 bg-surface px-2.5 py-2 font-mono text-[11px] text-foam placeholder:text-sand/40 focus:border-turquoise/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={applyImport}
            disabled={!paste.trim()}
            className="w-full rounded-xl border border-turquoise/50 py-3 text-sm font-semibold text-turquoise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquoise active:bg-turquoise/10 disabled:border-foam/15 disabled:text-sand/40"
          >
            Restore
          </button>
        </section>

        {message && (
          <p
            role="status"
            className={`text-sm leading-snug ${message.tone === 'ok' ? 'text-turquoise' : 'text-signal'}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </dialog>
  )
}
