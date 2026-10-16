// Web copies of the images the v2 page shows: capped size, WebP, with their
// pixel sizes written to v2media/sizes.json so tiles can reserve their space.
import sharp from 'sharp'
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'

const root = join(import.meta.dirname, '..')
const { items } = JSON.parse(readFileSync(join(root, '../content/media.json'), 'utf8'))
const sizes = {}
let before = 0, after = 0
for (const it of items) {
  const out = join(root, 'v2media', `${it.out}.webp`)
  mkdirSync(dirname(out), { recursive: true })
  let img = sharp(join(root, it.src), { failOn: 'none' })
  if (it.crop) img = img.extract(it.crop)
  const info = await img
    .resize({ width: it.max, height: it.max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: it.q ?? 78, alphaQuality: 100 })
    .toFile(out)
  sizes[`/v2media/${it.out}.webp`] = [info.width, info.height]
  before += statSync(join(root, it.src)).size
  after += info.size
}
writeFileSync(join(root, 'v2media/sizes.json'), JSON.stringify(sizes, null, 1) + '\n')
console.log(`${items.length} images: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(2)} MB`)
