// Local AI tutor: serves dist/ plus /api/* on the home network, answering with your own AI CLI.
// Run: bun run tutor   (TUTOR_CLI=codex to use Codex, TUTOR_MODEL to pick the Claude model)
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';
import { serveDist } from './static.mjs';
import { validateAsk, loadHelp, buildPrompt, cliCommand } from './tutor-lib.mjs';

const PORT = process.env.PORT === undefined ? 8080 : Number(process.env.PORT);
const LOG_DIR = join(ROOT, 'logs');
const UNAVAILABLE = "The tutor isn't available right now.";

function log(event) {
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(join(LOG_DIR, 'tutor.jsonl'), JSON.stringify({ t: new Date().toISOString(), ...event }) + '\n');
}

async function readJson(req) {
  let s = '';
  for await (const c of req) { s += c; if (s.length > 10000) return null; }
  try { return JSON.parse(s); } catch { return null; }
}

const send = (res, code, text) => { res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' }); res.end(text); };

async function ask(req, res) {
  const a = validateAsk(await readJson(req));
  if (a.error) return send(res, 400, a.error);
  const entry = loadHelp(a.page)?.entries?.[a.id];
  if (!entry) return send(res, 400, 'unknown question');

  const { cmd, args } = cliCommand(process.env);
  const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'ignore'] });
  let reply = '';
  const timer = setTimeout(() => child.kill(), 60_000);
  child.on('error', () => {}); // ENOENT etc.; handled on close
  child.stdout.on('data', (d) => {
    if (!res.headersSent) res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    reply += d;
    res.write(d);
  });
  child.on('close', (code) => {
    clearTimeout(timer);
    if (!res.headersSent) return send(res, 503, UNAVAILABLE);
    res.end();
    if (code === 0) log({ event: 'ask', page: a.page, id: a.id, step: a.step, message: a.message, reply });
  });
  child.stdin.on('error', () => {});
  child.stdin.end(buildPrompt({ entry, ...a }));
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname === '/api/health') return send(res, 200, JSON.stringify({ ok: true, cli: cliCommand(process.env).cmd }));
  if (pathname === '/api/ask' && req.method === 'POST') return ask(req, res);
  if (pathname === '/api/log' && req.method === 'POST') {
    const b = await readJson(req);
    if (b && /^[a-z0-9-]+$/.test(b.page) && /^(I|II|III)(-\d+)?$/.test(b.id) && [1, 2, 3].includes(b.step)) {
      log({ event: 'hint', page: b.page, id: b.id, step: b.step });
    }
    res.writeHead(204); return res.end();
  }
  return serveDist(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tutor at http://${hostname().split('.')[0]}.local:${server.address().port}/  (using ${cliCommand(process.env).cmd})`);
});
