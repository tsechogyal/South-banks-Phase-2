// Builds optimized hero + gallery images from the originals in assets/images/source/
// and writes the matching markup into index.html between the <!-- build:* --> markers.
//
//   npm run images
//
// Drop a new original into assets/images/source/ with the filename listed below and
// re-run. Entries whose source file is missing are skipped, so the page always
// references images that exist.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'assets/images/source');
const OUT = join(ROOT, 'assets/images/opt');
const INDEX = join(ROOT, 'index.html');

// Order here = hero slideshow order. The first available entry is the LCP image.
// focus:  horizontal crop position for the portrait (phone) crop, 0 = left, 1 = right.
// focusY: vertical crop position when a tall image is cropped to widescreen for desktop.
// gallery: 'wide' spans the full gallery width; tall images are detected automatically.
const IMAGES = [
  { key: 'street-view', file: 'South Banks Street View.png', hero: true, gallery: 'wide', focus: 0.5,
    alt: 'Rendering of South Banks homes seen from the street' },
  { key: 'elevation-a', caption: 'Elevation A', file: 'South Banks Exterior - Elevation A.jpg', hero: true, gallery: true, focus: 0.42,
    alt: 'Rendering of South Banks townhomes in Elevation A: three storeys of brick and stone with gabled roofs and black balconies' },
  { key: 'package-a', caption: 'Kitchen, Package A', file: 'South Banks Package A - with people.jpg', hero: true, gallery: true, focus: 0.55, focusY: 0.62,
    alt: 'Rendering of a South Banks kitchen in Package A finishes, with light oak cabinets and an island' },
  { key: 'elevation-c', caption: 'Elevation C', file: 'South Banks Exterior - Elevation C.jpg', hero: true, gallery: true, focus: 0.45,
    alt: 'Rendering of South Banks townhomes in Elevation C: light stone facades with rooftop terraces' },
  { key: 'shoreline', file: 'Shoreline Aerial.jpg', hero: true, gallery: false, focus: 0.5,
    alt: 'Aerial view of a sandy beach and shallow green lake water' },
  { key: 'package-c', caption: 'Kitchen, Package C', file: 'South Banks Package C - with people.jpg', hero: true, gallery: true, focus: 0.3, focusY: 0.6,
    alt: 'Rendering of a South Banks kitchen in Package C finishes, with white cabinets and a window looking out' },
  { key: 'rooftop', file: 'South Banks Rooftop Terrace.png', hero: true, gallery: true, focus: 0.5,
    alt: 'Rendering of a South Banks rooftop terrace' },
  { key: 'masterplan', file: 'Lakeview Village Site Plan.jpg', hero: true, gallery: 'wide', focus: 0.32,
    alt: 'Aerial rendering of the Lakeview Village waterfront masterplan with the South Banks site marked beside Waterway Common Park' },
  { key: 'package-b', caption: 'Kitchen, Package B', file: 'South Banks Package B - with people.jpg', hero: true, gallery: true, focus: 0.45, focusY: 0.62,
    alt: 'Rendering of a South Banks kitchen in Package B finishes, with dark wood cabinets' },
];

// Gallery order differs from the hero: site context first, then the homes.
const GALLERY_ORDER = ['street-view', 'elevation-a', 'elevation-c', 'rooftop', 'package-a', 'package-b', 'package-c', 'masterplan'];
const MAX_HERO = 6;

// Plain responsive images used directly in index.html (no generated markup).
const PLAIN = [
  { key: 'amenity-plan', file: 'South Banks Amenity Plan.jpg', widths: [900, 1800] },
  // Floor plans, rendered from page 2 of each model's PDF at 220 dpi.
  { key: 'plan-coast', file: 'Plan - coast.png', widths: [900, 1800] },
  { key: 'plan-coast-rt', file: 'Plan - coast-rt.png', widths: [900, 1800] },
  { key: 'plan-drift-rt', file: 'Plan - drift.png', widths: [900, 1800] },
  // Azure and Breeze come from 1600px screenshots of their PDFs.
  { key: 'plan-azure', file: 'Plan - azure.png', widths: [900, 1600] },
  { key: 'plan-breeze', file: 'Plan - breeze.png', widths: [900, 1600] },
  { key: 'plan-drift', file: 'Plan - drift-end.png', widths: [900, 1800] },
];

const HERO_LANDSCAPE = [960, 1440, 1920, 2560];
const HERO_PORTRAIT = [540, 828, 1080]; // 9:16 crops for phones
const GALLERY = [640, 1280];
const HERO_MIN_RATIO = 1.5; // desktop hero crops are at least 3:2
const AVIF = { quality: 50, effort: 5 };
const WEBP = { quality: 74, effort: 5 };

mkdirSync(OUT, { recursive: true });

const rel = (f) => `assets/images/opt/${f}`;

async function encode(pipeline, base, w, h) {
  const avif = `${base}-${w}.avif`;
  const webp = `${base}-${w}.webp`;
  await pipeline.clone().avif(AVIF).toFile(join(OUT, avif));
  await pipeline.clone().webp(WEBP).toFile(join(OUT, webp));
  return { w, h, avif: rel(avif), webp: rel(webp) };
}

// Resize to each width. With minRatio set, images taller than that ratio (w/h) are
// first cropped to it, so a portrait rendering still fills a widescreen hero.
async function landscape(img, meta, base, widths, { minRatio = 0, focusY = 0.5 } = {}) {
  let src = img;
  let { width, height } = meta;
  if (minRatio && width / height < minRatio) {
    const cropH = Math.round(width / minRatio);
    const top = Math.round((height - cropH) * focusY);
    src = img.clone().extract({ left: 0, top, width, height: cropH });
    height = cropH;
  }
  const out = [];
  const list = widths.filter((w) => w <= width);
  if (!list.length || list.at(-1) < width && list.length < widths.length) list.push(width);
  for (const w of [...new Set(list)]) {
    const h = Math.round((height / width) * w);
    out.push(await encode(src.clone().resize(w, h), base, w, h));
  }
  return out;
}

async function portrait(img, meta, base, focus) {
  // Largest 9:16 window that fits in the source, positioned by `focus`.
  const cropH = meta.height;
  const cropW = Math.min(meta.width, Math.round((cropH * 9) / 16));
  const left = Math.round((meta.width - cropW) * focus);
  const out = [];
  const list = HERO_PORTRAIT.filter((w) => w <= cropW);
  if (!list.length) list.push(cropW);
  for (const w of list) {
    const h = Math.round((w * 16) / 9);
    const p = img.clone().extract({ left, top: 0, width: cropW, height: cropH }).resize(w, h, { fit: 'cover' });
    out.push(await encode(p, `${base}-p`, w, h));
  }
  return out;
}

const srcset = (set, fmt) => set.map((s) => `${s[fmt]} ${s.w}w`).join(', ');

function heroSlide(entry, i) {
  const { alt, land, port } = entry;
  const first = i === 0;
  // Later slides keep their URLs in data-* so they are not downloaded with the page.
  const a = first ? '' : 'data-';
  const fallback = land.find((s) => s.w >= 1440) ?? land.at(-1);
  const mq = '(orientation: portrait)';
  return `
        <div class="hero__slide${first ? ' is-active' : ''}" data-slide${first ? '' : ' aria-hidden="true"'}>
          <picture>
            <source type="image/avif" media="${mq}" ${a}srcset="${srcset(port, 'avif')}" sizes="100vw">
            <source type="image/webp" media="${mq}" ${a}srcset="${srcset(port, 'webp')}" sizes="100vw">
            <source type="image/avif" ${a}srcset="${srcset(land, 'avif')}" sizes="100vw">
            <source type="image/webp" ${a}srcset="${srcset(land, 'webp')}" sizes="100vw">
            <img ${a}src="${fallback.webp}" alt="${alt}" width="${fallback.w}" height="${fallback.h}"${first ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">
          </picture>
        </div>`;
}

function preloads(entry) {
  const { land, port } = entry;
  return `
  <link rel="preload" as="image" type="image/avif" media="(orientation: portrait)" imagesrcset="${srcset(port, 'avif')}" imagesizes="100vw" fetchpriority="high">
  <link rel="preload" as="image" type="image/avif" media="(orientation: landscape)" imagesrcset="${srcset(land, 'avif')}" imagesizes="100vw" fetchpriority="high">`;
}

function galleryItem(entry) {
  const { alt, gal } = entry;
  const big = gal.at(-1);
  const shape = entry.gallery === 'wide' ? ' gallery__item--wide' : big.h > big.w ? ' gallery__item--tall' : '';
  return `
          <figure class="gallery__item${shape} reveal">
            <a href="${big.webp}" class="gallery__link" data-lightbox aria-label="Open larger image: ${alt}">
              <picture class="parallax">
                <source type="image/avif" srcset="${srcset(gal, 'avif')}" sizes="(min-width: 900px) 60vw, 86vw">
                <img src="${gal[0].webp}" srcset="${srcset(gal, 'webp')}" sizes="(min-width: 900px) 60vw, 86vw" alt="${alt}" width="${gal[0].w}" height="${gal[0].h}" loading="lazy" decoding="async">
              </picture>
            </a>${entry.caption ? `
            <figcaption>${entry.caption}</figcaption>` : ''}
          </figure>`;
}

function replaceBlock(html, name, content) {
  const re = new RegExp(`(<!-- build:${name} -->)[\\s\\S]*?(\\s*<!-- /build:${name} -->)`);
  if (!re.test(html)) throw new Error(`Marker build:${name} not found in index.html`);
  return html.replace(re, `$1${content}$2`);
}

const ready = [];
for (const entry of IMAGES) {
  const path = join(SRC, entry.file);
  if (!existsSync(path)) {
    console.warn(`skip  ${entry.file} (not in assets/images/source)`);
    continue;
  }
  const img = sharp(path, { limitInputPixels: false }).rotate().toColorspace('srgb');
  const meta = await img.metadata();
  const built = { ...entry };
  if (entry.hero) {
    built.land = await landscape(img, meta, entry.key, HERO_LANDSCAPE, { minRatio: HERO_MIN_RATIO, focusY: entry.focusY });
    built.port = await portrait(img, meta, entry.key, entry.focus);
  }
  if (entry.gallery) built.gal = await landscape(img, meta, `${entry.key}-g`, GALLERY);
  console.log(`built ${entry.file} (${meta.width}x${meta.height})`);
  ready.push(built);
}

for (const { key, file, widths } of PLAIN) {
  const path = join(SRC, file);
  if (!existsSync(path)) continue;
  const img = sharp(path).rotate().toColorspace('srgb');
  await landscape(img, await img.metadata(), key, widths);
  console.log(`built ${file}`);
}

const heroes = ready.filter((e) => e.hero).slice(0, MAX_HERO);
const gallery = GALLERY_ORDER.map((k) => ready.find((e) => e.key === k && e.gallery)).filter(Boolean);
if (!heroes.length) throw new Error('No hero images available');

// Social share image from the first hero.
const og = ready.find((e) => e.hero);
await sharp(join(SRC, og.file), { limitInputPixels: false })
  .resize(1200, 630, { fit: 'cover', position: 'attention' })
  .jpeg({ quality: 78, mozjpeg: true })
  .toFile(join(OUT, 'og.jpg'));

let html = readFileSync(INDEX, 'utf8');
html = replaceBlock(html, 'preload', preloads(heroes[0]));
html = replaceBlock(html, 'hero', heroes.map(heroSlide).join(''));
html = replaceBlock(html, 'gallery', gallery.map(galleryItem).join(''));
writeFileSync(INDEX, html);
console.log(`index.html: ${heroes.length} hero slides, ${gallery.length} gallery images`);
