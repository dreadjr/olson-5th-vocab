// Local AI tutor: serves dist/ plus /api/* on the home network, answering with your own AI CLI.
// Run: bun run tutor   (TUTOR_MODEL picks the Claude model)
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';
import { serveDist } from './static.mjs';
import { validateAsk, validateCheck, loadHelp, loadKey, buildPrompt, buildCheckPrompt, parseCheck, cliCommand } from './tutor-lib.mjs';

const PORT = process.env.PORT === undefined ? 8080 : Number(process.env.PORT);
const LOG_DIR = join(ROOT, 'logs');
const UNAVAILABLE = "The tutor isn't available right now.";
const TIMEOUT_MS = Number(process.env.TUTOR_TIMEOUT_MS) || 60_000;
// The CLI runs in an empty folder so it can't pick up this repo's CLAUDE.md or project memory.
const SANDBOX = mkdtempSync(join(tmpdir(), 'tutor-'));

function log(event) {
  mkdirSync(LOG_DIR, { recursive: true });
  appendFileSync(join(LOG_DIR, 'tutor.jsonl'), JSON.stringify({ t: new Date().toISOString(), ...event }) + '\n');
}

async function readJson(req) {
  try {
    let s = '';
    for await (const c of req) { s += c; if (s.length > 10000) return null; }
    return JSON.parse(s);
  } catch { return null; } // bad JSON, or the upload was cut off
}

const send = (res, code, text) => { res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' }); res.end(text); };

/** Run the CLI on a prompt. Resolves the trimmed reply, or null if it failed, timed out or printed nothing.
 *  Only a clean exit counts: the CLI prints its errors (usage limit, sign-in) on stdout too. */
function runCli(prompt) {
  return new Promise((resolve) => {
    const { cmd, args } = cliCommand(process.env);
    const child = spawn(cmd, args, { cwd: SANDBOX, stdio: ['pipe', 'pipe', 'ignore'] });
    let out = '', done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (!ok) child.kill('SIGKILL');
      resolve(ok ? out.trim() : null);
    };
    const timer = setTimeout(() => finish(false), TIMEOUT_MS);
    child.on('error', () => finish(false)); // CLI not installed
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', (code) => finish(code === 0 && out.trim() !== ''));
    child.stdin.on('error', () => {});
    child.stdin.end(prompt);
  });
}

async function ask(req, res) {
  const a = validateAsk(await readJson(req));
  if (a.error) return send(res, 400, a.error);
  const entry = loadHelp(a.page)?.entries?.[a.id];
  if (!entry) return send(res, 400, 'unknown question');
  const reply = await runCli(buildPrompt({ entry, ...a }));
  if (!reply) return send(res, 503, UNAVAILABLE);
  send(res, 200, reply);
  log({ event: 'ask', page: a.page, id: a.id, step: a.step, message: a.message, reply });
}

async function check(req, res) {
  const a = validateCheck(await readJson(req));
  if (a.error) return send(res, 400, a.error);
  const key = loadKey(a.page, a.id); // from the page on disk, never from the browser
  if (!key) return send(res, 400, 'unknown question');
  const reply = await runCli(buildCheckPrompt({ key, ...a }));
  const result = reply && parseCheck(reply);
  if (!result) return send(res, 503, UNAVAILABLE);
  send(res, 200, JSON.stringify(result));
  log({ event: 'check', page: a.page, id: a.id, answer: a.answer, ...result });
}

const server = createServer((req, res) => handle(req, res).catch(() => {
  if (!res.headersSent) send(res, 400, 'bad request'); else res.end();
}));

async function handle(req, res) {
  const { pathname } = new URL(req.url, 'http://x');
  if (pathname === '/api/health') return send(res, 200, JSON.stringify({ ok: true, cli: cliCommand(process.env).cmd }));
  if (pathname === '/api/ask' && req.method === 'POST') return ask(req, res);
  if (pathname === '/api/check' && req.method === 'POST') return check(req, res);
  if (pathname === '/api/log' && req.method === 'POST') {
    const b = await readJson(req);
    if (b && /^[a-z0-9-]+$/.test(b.page) && /^(I|II|III)(-\d+)?$/.test(b.id) && [1, 2, 3].includes(b.step)) {
      log({ event: 'hint', page: b.page, id: b.id, step: b.step });
    }
    res.writeHead(204); return res.end();
  }
  return serveDist(req, res);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tutor at http://${hostname().split('.')[0]}.local:${server.address().port}/  (using ${cliCommand(process.env).cmd})`);
});
