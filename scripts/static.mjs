// Serves files from dist/ (shared by the preview server and the local tutor).
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { ROOT } from './lib.mjs';

const DIST = join(ROOT, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.js': 'text/javascript', '.pdf': 'application/pdf' };

export async function serveDist(req, res) {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, p);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
}
