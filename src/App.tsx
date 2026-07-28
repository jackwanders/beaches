import { candidates } from './lib/candidates'

// Shell only — the home screen is step 5.
export default function App() {
  const list = candidates(new Date(), {})
  return (
    <main className="min-h-dvh bg-[#0B2B3C] p-6 text-[#F7FAFA]">
      <h1 className="text-2xl">Beaches Dining</h1>
      <p className="mt-2 text-[#39C7C0]">{list.length} candidates right now</p>
    </main>
  )
}
