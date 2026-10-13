// Prévisualisation locale. Les faux comptes/données ne sont servis que sous /__test__/.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const mock = url.pathname.startsWith('/__test__/');
    let relative = decodeURIComponent(mock ? url.pathname.slice('/__test__/'.length) : url.pathname.slice(1));
    if (!relative) relative = 'index.html';
    if (relative === 'mock-sdk.js' && mock) relative = 'tests/mock-sdk.js';
    const target = path.resolve(root, relative);
    if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404).end(); return; }
    if (target.includes(path.sep + '.git' + path.sep)) { res.writeHead(403).end(); return; }
    let data = fs.readFileSync(target);
    if (mock && target.endsWith('.html')) data = Buffer.from(data.toString().replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.2/dist/umd/supabase.js', 'mock-sdk.js'));
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'text/plain', 'Cache-Control': 'no-store' });
    res.end(data);
}).listen(4173, '127.0.0.1', () => console.log('Prévisualisation : http://127.0.0.1:4173/ — tests : /__test__/admin.html'));
