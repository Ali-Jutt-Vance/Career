/**
 * Generates Career Book.ico (multi-resolution, PNG-compressed) from an inline SVG.
 * Renders each size in a real browser so the gradients and curves are exact.
 *
 * Run: node app/make-icon.js
 */
const puppeteer = require('puppeteer');
const fs   = require('fs-extra');
const path = require('path');

const OUT_DIR = path.join(__dirname);
const ICO     = path.join(OUT_DIR, 'career-book.ico');
const PNG512  = path.join(OUT_DIR, 'career-book.png');
const SIZES   = [16, 24, 32, 48, 64, 128, 256];

/**
 * An open book whose right-hand page rises into an ascending chart —
 * study becoming a career. Reads as a solid mark even at 16px.
 */
function svg(size) {
  const detail = size >= 48; // drop hairlines at small sizes
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="#1e3a8a"/>
      <stop offset="55%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#0f2557"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%"   stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fcd34d"/>
    </linearGradient>
    <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  ${detail ? `<rect x="4" y="4" width="504" height="504" rx="109" fill="none" stroke="rgba(255,255,255,.13)" stroke-width="7"/>` : ''}

  <!-- open book -->
  <g transform="translate(0,26)">
    <!-- left page -->
    <path d="M78 300 C 78 300, 140 262, 246 288 L 246 404 C 140 378, 78 414, 78 414 Z"
          fill="url(#page)"/>
    <!-- right page -->
    <path d="M434 300 C 434 300, 372 262, 266 288 L 266 404 C 372 378, 434 414, 434 414 Z"
          fill="url(#page)" opacity="0.93"/>
    <!-- spine -->
    <rect x="246" y="286" width="20" height="120" rx="6" fill="#93c5fd"/>
    ${detail ? `
    <path d="M112 322 C 112 322, 168 296, 226 312" stroke="#93c5fd" stroke-width="11" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M400 322 C 400 322, 344 296, 286 312" stroke="#93c5fd" stroke-width="11" fill="none" stroke-linecap="round" opacity=".55"/>` : ''}
  </g>

  <!-- ascending bars rising out of the book -->
  <g transform="translate(0,-6)">
    <rect x="176" y="228" width="42" height="84"  rx="12" fill="url(#gold)" opacity=".85"/>
    <rect x="238" y="180" width="42" height="132" rx="12" fill="url(#gold)" opacity=".93"/>
    <rect x="300" y="120" width="42" height="192" rx="12" fill="url(#gold)"/>
  </g>

  <!-- trajectory arrow -->
  <path d="M168 214 L 258 158 L 322 96" stroke="#ffffff" stroke-width="${detail ? 22 : 26}"
        fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M262 84 L 340 84 L 340 158" stroke="#ffffff" stroke-width="${detail ? 22 : 26}"
        fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

/** Build a Windows .ico containing PNG-compressed images (Vista+). */
function buildIco(images) {
  const count  = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: icon
  header.writeUInt16LE(count, 4);  // image count

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;

  images.forEach((img, i) => {
    const b = i * 16;
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, b + 0); // width  (0 == 256)
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, b + 1); // height
    dir.writeUInt8(0, b + 2);                 // palette count
    dir.writeUInt8(0, b + 3);                 // reserved
    dir.writeUInt16LE(1,  b + 4);             // colour planes
    dir.writeUInt16LE(32, b + 6);             // bits per pixel
    dir.writeUInt32LE(img.data.length, b + 8);
    dir.writeUInt32LE(offset, b + 12);
    offset += img.data.length;
  });

  return Buffer.concat([header, dir, ...images.map(i => i.data)]);
}

(async () => {
  console.log('\n  Generating Career Book icon\n');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });

  const images = [];
  for (const size of SIZES) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg(size)}</body></html>`,
      { waitUntil: 'domcontentloaded' }
    );
    const data = await page.screenshot({ omitBackground: true, type: 'png' });
    images.push({ size, data: Buffer.from(data) });
    console.log(`     ${String(size).padStart(3)}×${size}  ${String(data.length).padStart(6)} bytes`);
  }

  // A large PNG too, useful for the taskbar/README.
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(512)}</body></html>`,
    { waitUntil: 'domcontentloaded' });
  const big = await page.screenshot({ omitBackground: true, type: 'png' });
  await fs.writeFile(PNG512, big);

  await browser.close();

  await fs.writeFile(ICO, buildIco(images));
  const stat = await fs.stat(ICO);
  console.log(`\n  ✓ ${ICO}  (${SIZES.length} sizes, ${(stat.size / 1024).toFixed(1)} KB)`);
  console.log(`  ✓ ${PNG512}\n`);
})().catch(e => { console.error('[ICON FAILED]', e); process.exit(1); });
