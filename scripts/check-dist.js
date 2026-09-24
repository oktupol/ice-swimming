// Checks the built site in dist/ for the invariants that break silently: nothing in the
// build fails when they are violated, the site just quietly gets worse (a broken link,
// a hero image downloaded twice, a share card without an image, a deindexed page).
//
// Run after `npm run build` (npm run check:dist). Only the pages and the bundle they
// reference are inspected — dist/ is never wiped, so stale bundles from earlier builds
// are simply ignored.

const fs = require('fs');
const path = require('path');
const { parse } = require('node-html-parser');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const ORIGIN = 'https://aqualign.de';

// GitHub Pages serves 404.html for any unknown URL, at any depth. Resolving its links
// against a nested path catches relative URLs that only work from the site root.
const NOT_FOUND_BASE = `${ORIGIN}/does/not/exist`;

// The @types index.ejs describes in its JSON-LD block.
const EXPECTED_JSON_LD_TYPES = ['Person', 'WebSite', 'Service'];

/** @type {string[]} */
const errors = [];
const fail = (page, message) => {
    const error = `${page}: ${message}`;
    if (!errors.includes(error)) errors.push(error);
};

const readPage = (file) => parse(fs.readFileSync(path.join(DIST_DIR, file), 'utf8'));

// Maps a same-origin URL to the file in dist/ that serves it ('/' → index.html).
function distFileFor(url) {
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    return path.join(DIST_DIR, pathname);
}

// Every URL a page makes the browser fetch or navigate to, as [attribute, value] pairs.
function collectUrls(doc) {
    const urls = [];
    for (const el of doc.querySelectorAll('[href], [src], [srcset]')) {
        for (const attr of ['href', 'src']) {
            const value = el.getAttribute(attr);
            if (value !== undefined) urls.push([`${el.tagName.toLowerCase()}[${attr}]`, value]);
        }
        const srcset = el.getAttribute('srcset');
        if (srcset !== undefined) {
            for (const candidate of srcset.split(',')) {
                urls.push([
                    `${el.tagName.toLowerCase()}[srcset]`,
                    candidate.trim().split(/\s+/)[0],
                ]);
            }
        }
    }
    return urls;
}

function checkLinks(file, doc, pages) {
    const base =
        file === '404.html' ? NOT_FOUND_BASE : `${ORIGIN}/${file === 'index.html' ? '' : file}`;
    for (const [where, value] of collectUrls(doc)) {
        // An in-page fragment stays on the page whatever URL it is served under.
        if (value.startsWith('#')) {
            if (value.length > 1 && !doc.getElementById(decodeURIComponent(value.slice(1)))) {
                fail(file, `${where}="${value}" points at an element that does not exist`);
            }
            continue;
        }

        const url = new URL(value, base);
        if (url.origin !== ORIGIN || /^https?:\/\//.test(value)) continue;

        const target = distFileFor(url);
        if (!fs.existsSync(target)) {
            fail(file, `${where}="${value}" resolves to ${url.pathname}, which is not in dist/`);
            continue;
        }

        // A fragment on a page link must name an element of that page.
        const fragment = decodeURIComponent(url.hash.slice(1));
        if (fragment && target.endsWith('.html')) {
            const targetDoc = pages.get(path.relative(DIST_DIR, target));
            if (targetDoc && !targetDoc.getElementById(fragment)) {
                fail(file, `${where}="${value}" points at #${fragment}, which does not exist`);
            }
        }
    }
}

function checkDocument(file, doc) {
    const lang = doc.querySelector('html')?.getAttribute('lang');
    if (lang !== 'de') fail(file, `<html lang> is "${lang}", expected "de"`);

    if (!doc.querySelector('title')?.text.trim()) fail(file, 'missing or empty <title>');

    const seen = new Set();
    for (const el of doc.querySelectorAll('[id]')) {
        if (seen.has(el.id)) fail(file, `duplicate id="${el.id}"`);
        seen.add(el.id);
    }

    for (const img of doc.querySelectorAll('img')) {
        if (img.getAttribute('alt') === undefined) {
            fail(file, `<img src="${img.getAttribute('src')}"> has no alt attribute`);
        }
    }
}

// The hero backgrounds are preloaded by partials/_hero-preload.ejs and requested again
// by the image-set() in header.scss. If the two URLs differ, the image is fetched twice.
// The CSS ships inside the bundle (style-loader), so that's where the image-set() is.
function checkHeroPreloads(file, doc) {
    const preloaded = doc
        .querySelectorAll('link[rel="preload"][as="image"]')
        .map((link) => link.getAttribute('href'))
        .sort();

    const bundleCss = doc
        .querySelectorAll('script[src]')
        .map((script) =>
            path.join(DIST_DIR, new URL(script.getAttribute('src'), `${ORIGIN}/`).pathname),
        )
        .filter((bundle) => fs.existsSync(bundle))
        .map((bundle) => fs.readFileSync(bundle, 'utf8'))
        .join('\n');
    const inImageSet = [...new Set(bundleCss.match(/\/public\/[\w.-]+\.avif/g) || [])].sort();

    if (JSON.stringify(preloaded) !== JSON.stringify(inImageSet)) {
        fail(
            file,
            `preloaded images [${preloaded.join(', ')}] do not match the AVIF entries of ` +
                `the hero image-set() [${inImageSet.join(', ')}] — update partials/_hero-preload.ejs`,
        );
    }
}

function checkMetadata(file, doc) {
    const meta = (selector) => doc.querySelector(selector)?.getAttribute('content');

    if (file === '404.html') {
        if (!/noindex/.test(meta('meta[name="robots"]') || ''))
            fail(file, 'must be marked robots noindex');
        return;
    }

    const expectedUrl = `${ORIGIN}/${file === 'index.html' ? '' : file}`;
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
    if (canonical !== expectedUrl)
        fail(file, `canonical is "${canonical}", expected "${expectedUrl}"`);
    if (meta('meta[property="og:url"]') !== expectedUrl)
        fail(file, `og:url is not "${expectedUrl}"`);

    for (const name of ['name="description"', 'property="og:title"', 'property="og:description"']) {
        if (!meta(`meta[${name}]`)?.trim()) fail(file, `missing or empty <meta ${name}>`);
    }

    // Crawlers do not resolve relative URLs, and the image has to actually be deployed.
    const ogImage = meta('meta[property="og:image"]') || '';
    if (!ogImage.startsWith(`${ORIGIN}/`)) {
        fail(file, `og:image "${ogImage}" must be an absolute ${ORIGIN} URL`);
    } else if (!fs.existsSync(distFileFor(new URL(ogImage)))) {
        fail(file, `og:image "${ogImage}" is not in dist/`);
    }
}

function checkJsonLd(file, doc) {
    const blocks = doc.querySelectorAll('script[type="application/ld+json"]');
    if (file === 'index.html' && blocks.length === 0) fail(file, 'missing its JSON-LD block');

    const types = new Set();
    for (const block of blocks) {
        let data;
        try {
            data = JSON.parse(block.text);
        } catch (error) {
            fail(file, `JSON-LD does not parse: ${error.message}`);
            continue;
        }
        for (const node of data['@graph'] || [data]) types.add(node['@type']);
    }
    if (file === 'index.html') {
        for (const type of EXPECTED_JSON_LD_TYPES) {
            if (!types.has(type)) fail(file, `JSON-LD has no "${type}" node`);
        }
    }
}

// Cloudflare Pages deployments are previews and mirrors only and must never be indexed.
function checkHeaders() {
    const headersFile = path.join(DIST_DIR, '_headers');
    if (!fs.existsSync(headersFile)) {
        fail('_headers', 'missing from dist/ — Cloudflare deployments would become indexable');
    } else if (
        !/^\/\*\s*\n\s+X-Robots-Tag:.*\bnoindex\b/m.test(fs.readFileSync(headersFile, 'utf8'))
    ) {
        fail('_headers', 'does not set X-Robots-Tag: noindex for /*');
    }
}

// The CSS is injected from the bundle as <style> text, where a byte-order mark is not
// stripped: it invalidates the first rule (the regular @font-face), so all text renders bold.
function checkBundles(pages) {
    const bundles = new Set();
    for (const doc of pages.values()) {
        for (const script of doc.querySelectorAll('script[src]')) {
            const bundle = distFileFor(new URL(script.getAttribute('src'), `${ORIGIN}/`));
            if (fs.existsSync(bundle)) bundles.add(bundle);
        }
    }
    for (const bundle of bundles) {
        const source = fs.readFileSync(bundle, 'utf8');
        if (source.includes('\ufeff') || /\\ufeff/i.test(source)) {
            fail(
                path.relative(DIST_DIR, bundle),
                'contains a byte-order mark — the injected CSS would lose its first rule',
            );
        }
    }
}

function main() {
    if (!fs.existsSync(DIST_DIR)) {
        console.error('dist/ does not exist — run `npm run build` first.');
        process.exit(1);
    }

    const files = fs
        .readdirSync(DIST_DIR)
        .filter((f) => f.endsWith('.html'))
        .sort();
    const pages = new Map(files.map((file) => [file, readPage(file)]));

    for (const [file, doc] of pages) {
        checkDocument(file, doc);
        checkLinks(file, doc, pages);
        checkHeroPreloads(file, doc);
        checkMetadata(file, doc);
        checkJsonLd(file, doc);
    }
    checkBundles(pages);
    checkHeaders();

    if (errors.length) {
        console.error(`check-dist: ${errors.length} problem(s) found\n`);
        for (const error of errors) console.error(`  ✗ ${error}`);
        process.exit(1);
    }
    console.log(`check-dist: ${files.length} pages OK`);
}

main();
