// Converts every referenced JPG in public/ into responsive WebP variants using Sharp.
//
// Runs before webpack (via the prebuild/prestart/prewatch npm hooks). It scans src/
// for JPG basenames, so adding a new image requires no config change — just reference
// it from an .ejs (via the picture() helper) or .scss (background url) and rebuild.
//
// Output: dist/public/<name>-<width>.webp (responsive variants), dist/public/<name>.webp
// (full size, used by hero CSS image-set), and a manifest at image-manifest.json that the
// picture() helper reads to build the <img srcset>.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'dist', 'public');
const MANIFEST_PATH = path.join(ROOT, 'image-manifest.json');

const WIDTHS = [480, 768, 1024, 1440, 1920];
const QUALITY = 80;

const TEXT_EXTENSIONS = /\.(ejs|js|ts|scss|css|html)$/;
const JPG_REF_REGEX = /[\w.\-]+\.jpe?g/g;

// Collect every JPG basename mentioned anywhere in src/. This catches both
// picture('portrait.jpg') in EJS and url(".../eisbaden.jpg") in SCSS, and naturally
// excludes images that aren't referenced at all.
function findReferencedJpgs(dir, found = new Set()) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findReferencedJpgs(full, found);
        } else if (TEXT_EXTENSIONS.test(entry.name)) {
            const content = fs.readFileSync(full, 'utf8');
            let m;
            while ((m = JPG_REF_REGEX.exec(content)) !== null) found.add(path.basename(m[0]));
        }
    }
    return found;
}

// Remove the outputs recorded in the previous manifest. dist/ is never wiped by webpack,
// so without this, variants from deleted/renamed images would linger.
function cleanPreviousOutputs() {
    if (!fs.existsSync(MANIFEST_PATH)) return;
    let previous;
    try {
        previous = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch {
        return;
    }
    for (const entry of Object.values(previous)) {
        const files = [entry.webp, ...(entry.variants || []).map((v) => v.src)];
        for (const rel of files) {
            const abs = path.join(ROOT, 'dist', rel);
            if (fs.existsSync(abs)) fs.rmSync(abs);
        }
    }
}

async function generate() {
    const referenced = findReferencedJpgs(SRC_DIR);
    // The Open Graph image is a fixed 1200x630 social asset produced by
    // scripts/generate-og-image.js and referenced by absolute URL. Crawlers fetch
    // exactly that file, so responsive variants of it would never be used.
    referenced.delete('og-image.jpg');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    cleanPreviousOutputs();

    const manifest = {};

    for (const basename of [...referenced].sort()) {
        const input = path.join(PUBLIC_DIR, basename);
        if (!fs.existsSync(input)) {
            console.warn(`[images] referenced but missing in public/: ${basename}`);
            continue;
        }

        const stem = basename.replace(/\.jpe?g$/i, '');
        const { width, height } = await sharp(input).metadata();

        // Downscaled variants for <img srcset> (only widths smaller than the source).
        const variants = [];
        for (const w of WIDTHS.filter((w) => w < width)) {
            const file = `${stem}-${w}.webp`;
            await sharp(input)
                .resize(w, null, { withoutEnlargement: true })
                .webp({ quality: QUALITY })
                .toFile(path.join(OUT_DIR, file));
            variants.push({ width: w, src: `public/${file}` });
        }

        // Full-size WebP — used by the hero CSS image-set() and doubles as the largest
        // srcset entry (so we don't emit a redundant `-<intrinsic width>.webp`).
        const fullWebp = `${stem}.webp`;
        await sharp(input).webp({ quality: QUALITY }).toFile(path.join(OUT_DIR, fullWebp));
        variants.push({ width, src: `public/${fullWebp}` });

        manifest[basename] = {
            width,
            height,
            variants,
            webp: `public/${fullWebp}`,
        };
        console.log(`[images] ${basename} → ${variants.length} webp variant(s) + full size`);
    }

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`[images] wrote ${path.relative(ROOT, MANIFEST_PATH)} (${Object.keys(manifest).length} image(s))`);
}

generate().catch((err) => {
    console.error('[images] generation failed:', err);
    process.exit(1);
});
