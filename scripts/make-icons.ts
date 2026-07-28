/**
 * Render the app icon SVGs to the PNG sizes the manifest and iOS need.
 *
 * Two sources: `icon.svg` has rounded corners for contexts that show the icon
 * as-is, `icon-square.svg` is full-bleed for the two that do their own
 * masking — Android maskable icons and iOS apple-touch-icon, which renders
 * transparency as black.
 *
 *   npm run icons
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'assets-src')
const out = join(root, 'public', 'icons')

const JOBS: { from: string; to: string; size: number }[] = [
  { from: 'icon.svg', to: 'icon-192.png', size: 192 },
  { from: 'icon.svg', to: 'icon-512.png', size: 512 },
  { from: 'icon-square.svg', to: 'icon-maskable-512.png', size: 512 },
  // iOS wants a full square with no alpha; it applies its own rounding.
  { from: 'icon-square.svg', to: 'apple-touch-icon.png', size: 180 },
  { from: 'icon.svg', to: 'favicon-32.png', size: 32 },
]

await mkdir(out, { recursive: true })

for (const job of JOBS) {
  await sharp(join(src, job.from))
    .resize(job.size, job.size)
    .png({ compressionLevel: 9 })
    .toFile(join(out, job.to))
  console.log(`  ✓ icons/${job.to}  ${job.size}×${job.size}`)
}
