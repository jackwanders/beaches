const TONES = {
  sand: 'border-sand/40 text-sand/90',
  signal: 'border-signal/60 text-signal',
} as const

export function Badge({
  children,
  tone = 'sand',
  title,
}: {
  children: React.ReactNode
  tone?: keyof typeof TONES
  title?: string
}) {
  return (
    <span
      title={title}
      className={`rounded-full border px-2 py-0.5 text-[11px] leading-tight whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
