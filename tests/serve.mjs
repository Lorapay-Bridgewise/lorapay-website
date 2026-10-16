// Serves dist/ with the same security headers as vercel.json, so the tests catch CSP problems.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const headers = Object.fromEntries(vercel.headers[0].headers.map(h => [h.key, h.value]));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain' };

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  if (path.endsWith('/')) path += 'index';
  const candidates = [join(root, path), join(root, `${path}.html`)];
  for (const file of candidates) {
    try {
      if ((await stat(file)).isFile()) {
        res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', ...headers });
        return res.end(await readFile(file));
      }
    } catch {}
  }
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(await readFile(join(root, '404.html')));
}).listen(Number(process.env.PORT ?? 4322));
