// Builds the Open Graph share image: public/og-image.jpg (1200x630).
//
// Run manually with `npm run og-image` after changing the hero photo, logo or
// wording. Deliberately NOT part of the prebuild hooks: the subtitle is rendered
// by librsvg through fontconfig, and the CI runner has a different font set than
// a developer machine, so generating it there would silently swap Didact Gothic
// for a fallback face. (The wordmark itself is outlined paths, taken from
// src/html/partials/_wordmark.ejs, and needs no font.) Generating locally and committing the result keeps the
// share image byte-identical wherever the site is built.
//
// Social crawlers (Facebook, WhatsApp, LinkedIn, iMessage) do not render SVG, so
// this has to be a raster image — public/Logo.svg is composited into it rather
// than referenced directly.

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');

// Point fontconfig at the repo's own fonts so "Didact Gothic" resolves even
// though it is not installed system-wide. Must happen before sharp loads its
// native bindings, which initialise fontconfig.
const fontConfig = path.join(os.tmpdir(), 'aqualign-fonts.conf');
fs.writeFileSync(
    fontConfig,
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${path.join(ROOT, 'fonts')}</dir>
  <cachedir>${path.join(os.tmpdir(), 'aqualign-fc-cache')}</cachedir>
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>
</fontconfig>
`,
);
process.env.FONTCONFIG_FILE = fontConfig;

const sharp = require('sharp');

const WIDTH = 1200;
const HEIGHT = 630;
const HERO = path.join(ROOT, 'public', 'hero-eisbaden.jpg');
const LOGO = path.join(ROOT, 'public', 'Logo.svg');
const OUT = path.join(ROOT, 'public', 'og-image.jpg');

const WORDMARK = path.join(ROOT, 'src', 'html', 'partials', '_wordmark.ejs');

const LOGO_HEIGHT = 150;
const WORDMARK_WIDTH = 520;
const SUBTITLE = 'Präzision im Wasser – Mentale Stärke im Eis';

// Scrim: strongest at the bottom where the text sits, lighter at the top so the
// mountains stay visible.
const scrim =
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.35"/>
      <stop offset="0.45" stop-color="#000" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.72"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#s)"/>
</svg>`);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// The site's wordmark partial is the single source of the lettering: reuse its
// viewBox, gradients and paths, and colour them with the cold palette from
// tokens.scss, as the hero shows them over this photo in Eisbaden mode.
const wordmarkSvg = fs
    .readFileSync(WORDMARK, 'utf-8')
    .replace(/<%#[\s\S]*?%>/, '')
    .replace(/<svg class="wordmark" viewBox="([^"]+)"[^>]*>/, (_, viewBox) => {
        const [, , w, h] = viewBox.split(' ').map(Number);
        const height = Math.round((WORDMARK_WIDTH * h) / w);
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${WORDMARK_WIDTH}" height="${height}">`;
    })
    .replace(/<stop /g, '<stop stop-color="#00bdfe" ')
    .replace(/class="wordmark-name"/, 'fill="#bdf2ff"')
    .replace(/class="wordmark-tagline"/, 'fill="#00bdfe"')
    .replace(/class="wordmark-wave"/g, 'fill="none" stroke-width="2.5" stroke-linecap="round"');

const subtitle =
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <text x="${WIDTH / 2}" y="505" font-family="Didact Gothic" font-size="32" text-anchor="middle"
     fill="#bdf2ff" style="paint-order:stroke fill" stroke="#000" stroke-opacity="0.45"
     stroke-width="4">${esc(SUBTITLE)}</text>
</svg>`);

(async () => {
    const logo = await sharp(LOGO, { density: 384 })
        .resize({ height: LOGO_HEIGHT })
        .png()
        .toBuffer();
    const logoMeta = await sharp(logo).metadata();
    const wordmark = await sharp(Buffer.from(wordmarkSvg), { density: 288 })
        .resize({ width: WORDMARK_WIDTH })
        .png()
        .toBuffer();
    // A soft dark halo behind the letters, like the drop-shadow on the site.
    const alpha = await sharp(wordmark).extractChannel('alpha').toBuffer();
    const halo = await sharp({
        create: {
            width: WORDMARK_WIDTH,
            height: (await sharp(wordmark).metadata()).height,
            channels: 3,
            background: '#000',
        },
    })
        .joinChannel(alpha)
        .blur(5)
        .png()
        .toBuffer();
    const wordmarkTop = 120 + LOGO_HEIGHT + 30;
    const wordmarkLeft = Math.round((WIDTH - WORDMARK_WIDTH) / 2);

    await sharp(HERO)
        .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
        .composite([
            { input: scrim },
            { input: logo, top: 120, left: Math.round((WIDTH - logoMeta.width) / 2) },
            { input: halo, top: wordmarkTop, left: wordmarkLeft },
            { input: wordmark, top: wordmarkTop, left: wordmarkLeft },
            { input: subtitle },
        ])
        .jpeg({ quality: 88, mozjpeg: true })
        .toFile(OUT);

    const { size } = fs.statSync(OUT);
    console.log(
        `[og] wrote ${path.relative(ROOT, OUT)} (${WIDTH}x${HEIGHT}, ${(size / 1024).toFixed(0)} KB)`,
    );
})().catch((err) => {
    console.error('[og] generation failed:', err);
    process.exit(1);
});
