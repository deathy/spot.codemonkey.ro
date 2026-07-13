// Generates the PWA app icons from the pin logo. Build-time only; the generated
// PNGs in public/ are committed. Run with `npm run icons`.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const BG = '#0f172a';
const ACCENT = '#38bdf8';
// Same teardrop pin as favicon.svg: accent body with a punched-out dark centre.
const PIN =
  'M32 12c-8.3 0-15 6.7-15 15 0 10.5 13.2 22.4 14 23.1a1.5 1.5 0 0 0 2 0c.8-.7 14-12.6 14-23.1 0-8.3-6.7-15-15-15z';
const HOLE = `<circle cx="32" cy="27" r="6" fill="${BG}"/>`;

function iconSvg(size, { maskable = false } = {}) {
  // Maskable icons must be full-bleed (the OS applies its own circle/squircle
  // mask), and the logo must stay inside the ~80% safe zone — so no rounded
  // corners and a slightly shrunk, centred pin. "any" icons keep the rounding.
  const rx = maskable ? 0 : 14;
  const pin = maskable
    ? `<g transform="translate(32 32) scale(0.82) translate(-32 -32)"><path d="${PIN}" fill="${ACCENT}"/>${HOLE}</g>`
    : `<path d="${PIN}" fill="${ACCENT}"/>${HOLE}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${rx}" fill="${BG}"/>
  ${pin}
</svg>`;
}

async function render(name, size, opts) {
  const png = await sharp(Buffer.from(iconSvg(size, opts))).png().toBuffer();
  writeFileSync(join(publicDir, name), png);
  console.log(`  ${name} (${size}x${size})`);
}

console.log('Generating PWA icons into public/');
await render('icon-192.png', 192);
await render('icon-512.png', 512);
await render('icon-maskable-512.png', 512, { maskable: true });
console.log('Done.');
