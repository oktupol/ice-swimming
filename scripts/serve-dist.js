// Serves the built site in dist/ the way GitHub Pages does: `/` maps to index.html and any
// unknown path answers 404 with 404.html. Used by the Playwright tests (playwright.config.js),
// which need the production build rather than the webpack dev server.
//
// Usage: node scripts/serve-dist.js [port]   (default 4173)

const fs = require('fs');
const http = require('http');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const PORT = Number(process.argv[2]) || 4173;

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ttf': 'font/ttf',
    '.json': 'application/json',
};

// Resolves a request path to a file inside dist/, or null if there is none.
function resolveFile(urlPath) {
    let pathname = decodeURIComponent(urlPath);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(DIST_DIR, path.normalize(pathname));
    if (!file.startsWith(DIST_DIR + path.sep)) return null;
    return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

http.createServer((req, res) => {
    const file = resolveFile(new URL(req.url, 'http://localhost').pathname);
    const status = file ? 200 : 404;
    const body = file || path.join(DIST_DIR, '404.html');
    res.writeHead(status, {
        'Content-Type': TYPES[path.extname(body).toLowerCase()] || 'application/octet-stream',
    });
    fs.createReadStream(body).pipe(res);
}).listen(PORT, () => {
    console.log(`Serving dist/ on http://localhost:${PORT}`);
});
