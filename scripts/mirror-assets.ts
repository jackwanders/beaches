/**
 * Download every hero image, logo, and menu PDF from cdn.sandals.com into
 * public/assets/, then rewrite the JSON to point at the local copies.
 *
 * Cross-origin assets are painful to precache, so offline mode would fail for
 * the menus — the thing most worth having offline. And Sandals can re-path
 * those files at any time, including mid-trip.
 *
 * Idempotent and resumable: files that already exist are skipped, and a failed
 * download leaves the remote URL in place so the app still works.
 *
 *   npm run mirror
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')

type Job = {
  /** Remote URL to fetch. */
  url: string
  /** Path relative to public/, e.g. assets/venues/soy.jpg */
  local: string
  /** Called with the local path once the bytes are on disk. */
  commit: (local: string) => void
  label: string
}

/** Filenames carry apostrophes, commas and parentheses. Encode once, here. */
function encode(url: string): string {
  return encodeURI(url)
}

function extFrom(url: string, fallback: string): string {
  const m = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(new URL(url).pathname)
  return m ? m[1].toLowerCase() : fallback
}

/** A value that has already been rewritten to a local path. */
function isLocal(value: string): boolean {
  return value.startsWith('assets/')
}

const CONCURRENCY = 6

async function run(jobs: Job[]): Promise<{ ok: number; skipped: number; failed: string[] }> {
  const failed: string[] = []
  let ok = 0
  let skipped = 0
  let next = 0

  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++]
      const dest = join(publicDir, job.local)

      if (existsSync(dest)) {
        job.commit(job.local)
        skipped++
        continue
      }

      try {
        const res = await fetch(encode(job.url))
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())
        await mkdir(dirname(dest), { recursive: true })
        await writeFile(dest, buf)
        // Rewrite only on success. A failure leaves the remote URL untouched.
        job.commit(job.local)
        ok++
        console.log(`  ✓ ${job.local}  (${(buf.length / 1024).toFixed(0)} KB)`)
      } catch (err) {
        failed.push(`${job.label}: ${job.url} — ${(err as Error).message}`)
        console.log(`  ✗ ${job.label} — ${(err as Error).message}`)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return { ok, skipped, failed }
}

async function main() {
  const venuesPath = join(root, 'data/venues.json')
  const servicesPath = join(root, 'data/services.json')

  const venuesDoc = JSON.parse(await readFile(venuesPath, 'utf8'))
  const servicesDoc = JSON.parse(await readFile(servicesPath, 'utf8'))

  const jobs: Job[] = []

  const map = venuesDoc.resort.mapImage as string | null
  if (map && !isLocal(map)) {
    jobs.push({
      url: map,
      local: `assets/map.${extFrom(map, 'jpg')}`,
      commit: (l) => (venuesDoc.resort.mapImage = l),
      label: 'resort map',
    })
  }

  for (const venue of venuesDoc.venues) {
    // Calypso's has neither a hero nor a logo. Skip, don't crash.
    if (venue.heroSource && !isLocal(venue.heroSource)) {
      jobs.push({
        url: venue.heroSource,
        local: `assets/venues/${venue.slug}.${extFrom(venue.heroSource, 'jpg')}`,
        commit: (l) => (venue.heroSource = l),
        label: `${venue.slug} hero`,
      })
    }
    if (venue.logoSource && !isLocal(venue.logoSource)) {
      jobs.push({
        url: venue.logoSource,
        local: `assets/logos/${venue.slug}.${extFrom(venue.logoSource, 'png')}`,
        commit: (l) => (venue.logoSource = l),
        label: `${venue.slug} logo`,
      })
    }
  }

  const menuUrlBase = servicesDoc.menuUrlBase as string
  for (const service of servicesDoc.services) {
    // The Dive and Calypso's have no menu at all.
    if (!service.menuPath || isLocal(service.menuPath)) continue
    jobs.push({
      // Renamed to the service id: CDN filenames carry apostrophes, commas and
      // parentheses, and two services share one PDF.
      url: menuUrlBase + service.menuPath,
      local: `assets/menus/${service.id}.pdf`,
      commit: (l) => (service.menuPath = l),
      label: `${service.id} menu`,
    })
  }

  console.log(`Mirroring ${jobs.length} assets to public/assets/ …`)
  const { ok, skipped, failed } = await run(jobs)

  await writeFile(venuesPath, JSON.stringify(venuesDoc, null, 2) + '\n')
  await writeFile(servicesPath, JSON.stringify(servicesDoc, null, 2) + '\n')

  console.log(`\ndownloaded ${ok} · already present ${skipped} · failed ${failed.length}`)
  if (failed.length) {
    console.log('\nLeft pointing at the CDN:')
    for (const f of failed) console.log(`  ${f}`)
    process.exitCode = 1
  }
}

await main()
