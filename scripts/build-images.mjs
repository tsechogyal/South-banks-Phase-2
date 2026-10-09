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
// focus: horizontal crop position for the portrait (phone) crop, 0 = left, 1 = right.
const IMAGES = [
  { key: 'street-view', file: 'South Banks Street View.png', hero: true, gallery: true, focus: 0.5,
    alt: 'Rendering of South Banks homes seen from the street' },
  { key: 'elevation-a', file: 'South Banks Exterior - Elevation A.png', hero: true, gallery: true, focus: 0.5,
    alt: 'South Banks exterior rendering, Elevation A' },
  { key: 'shoreline', file: 'Shoreline Aerial.jpg', hero: true, gallery: false, focus: 0.5,
    alt: 'Aerial view of a sandy beach and shallow green lake water' },
  { key: 'rooftop', file: 'South Banks Rooftop Terrace.png', hero: true, gallery: true, focus: 0.5,
    alt: 'Rendering of a South Banks rooftop terrace' },
  { key: 'masterplan', file: 'Lakeview Village Site Plan.jpg', hero: true, gallery: true, focus: 0.32,
    alt: 'Aerial rendering of the Lakeview Village waterfront masterplan with the South Banks site marked beside Waterway Common Park' },
  { key: 'elevation-c', file: 'South Banks Exterior - Elevation C.png', hero: true, gallery: true, focus: 0.5,
    alt: 'South Banks exterior rendering, Elevation C' },
];

const HERO_LANDSCAPE = [960, 1440, 1920, 2560];
const HERO_PORTRAIT = [540, 828, 1080]; // 9:16 crops for phones
const GALLERY = [640, 1280];
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

async function landscape(img, meta, base, widths) {
  const out = [];
  const list = widths.filter((w) => w <= meta.width);
  if (!list.length || list.at(-1) < meta.width && list.length < widths.length) list.push(meta.width);
  for (const w of [...new Set(list)]) {
    const h = Math.round((meta.height / meta.width) * w);
    out.push(await encode(img.clone().resize(w, h), base, w, h));
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
  return `
          <figure class="gallery__item reveal">
            <a href="${big.webp}" class="gallery__link" data-lightbox aria-label="Open larger image: ${alt}">
              <picture class="parallax">
                <source type="image/avif" srcset="${srcset(gal, 'avif')}" sizes="(min-width: 900px) 60vw, 86vw">
                <img src="${gal[0].webp}" srcset="${srcset(gal, 'webp')}" sizes="(min-width: 900px) 60vw, 86vw" alt="${alt}" width="${gal[0].w}" height="${gal[0].h}" loading="lazy" decoding="async">
              </picture>
            </a>
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
    built.land = await landscape(img, meta, entry.key, HERO_LANDSCAPE);
    built.port = await portrait(img, meta, entry.key, entry.focus);
  }
  if (entry.gallery) built.gal = await landscape(img, meta, `${entry.key}-g`, GALLERY);
  console.log(`built ${entry.file} (${meta.width}x${meta.height})`);
  ready.push(built);
}

const heroes = ready.filter((e) => e.hero);
const gallery = ready.filter((e) => e.gallery);
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
