const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.resolve(__dirname, '../../image-manifest.json');

// Read the manifest fresh on every call (not require()) so it stays correct when the
// generator rewrites it during a long-lived `webpack serve`/`watch` session.
function loadManifest() {
    try {
        return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function escapeAttr(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Pick the variant nearest 1024px as the `src` fallback for the rare browser that
// ignores srcset.
function pickFallback(variants) {
    return variants.reduce((best, v) =>
        Math.abs(v.width - 1024) < Math.abs(best.width - 1024) ? v : best,
    );
}

// Build a responsive <picture> from the build-time image manifest: an AVIF <source>
// for browsers that support it, and a WebP <img> for the rest. The <picture> is
// `display: contents` (global.scss), so CSS keeps targeting the <img> as if it stood
// alone.
//
// `sizes` must describe the width the image is actually laid out at, or the browser
// picks the wrong variant.
//
// Usage in EJS: <%- picture('portrait.jpg', { alt: '…', sizes: '(min-width: 601px) 250px, 100vw' }) %>
function picture(name, opts = {}) {
    const manifest = loadManifest();
    const entry = manifest[name];
    if (!entry || !entry.variants.length) {
        throw new Error(
            `picture('${name}'): no generated variants found. Is the image in public/ and ` +
                `was scripts/generate-images.js run (prebuild hook)?`,
        );
    }

    const srcset = (format) => entry.variants.map((v) => `${v[format]} ${v.width}w`).join(', ');
    const src = pickFallback(entry.variants).webp;
    const sizes = opts.sizes || '100vw';
    const loading = opts.loading || 'lazy';

    const attrs = [
        `srcset="${escapeAttr(srcset('webp'))}"`,
        `sizes="${escapeAttr(sizes)}"`,
        `src="${escapeAttr(src)}"`,
        `width="${entry.width}"`,
        `height="${entry.height}"`,
        `alt="${escapeAttr(opts.alt || '')}"`,
        `loading="${escapeAttr(loading)}"`,
        'decoding="async"',
    ];
    if (opts.className) attrs.push(`class="${escapeAttr(opts.className)}"`);

    return (
        `<picture>` +
        `<source type="image/avif" srcset="${escapeAttr(srcset('avif'))}" sizes="${escapeAttr(sizes)}">` +
        `<img ${attrs.join(' ')}>` +
        `</picture>`
    );
}

module.exports = { picture };
