import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateAsk, buildPrompt, cliCommand } from './tutor-lib.mjs';

const ok = { page: 'b4-form-c', id: 'I-6', step: 1, question: 'q', message: 'why 72?' };

test('validateAsk', () => {
  assert.deepEqual(validateAsk(ok), ok);
  for (const bad of [{ message: '' }, { message: 'x'.repeat(501) }, { step: 4 }, { page: '../x' }, { id: 'IV-1' }]) {
    assert.ok(validateAsk({ ...ok, ...bad }).error, JSON.stringify(bad));
  }
});

test('buildPrompt puts limit last', () => {
  const entry = { tag: 'Lesson 4.5 · Ex. 3, p. 136', skill: 's', hints: ['HINT-ONE', 'HINT-TWO', 'HINT-THREE'] };
  const p = buildPrompt({ entry, step: 1, question: 'Nine dogs', message: 'just tell me' });
  assert.ok(p.includes('HINT-ONE'));
  assert.ok(p.indexOf('HINT-THREE') > p.indexOf('do not reveal'));
  assert.match(p.trim().split('\n').at(-1), /step 1/);
});

test('cliCommand runs claude with no tools and none of my own settings', () => {
  const c = cliCommand({});
  assert.equal(c.cmd, 'claude');
  for (const a of ['--tools', '', '--no-session-persistence', '--setting-sources']) assert.ok(c.args.includes(a), a);
  assert.equal(c.args[c.args.indexOf('--setting-sources') + 1], '');
  assert.equal(cliCommand({ TUTOR_CLI: 'codex' }).cmd, 'claude'); // codex can run shell commands, so it's not offered
});

// Start the tutor with a fake `claude` (a shell script body, or none) on PATH; returns {base, stop}.
async function startTutor(fakeClaude, extraEnv = {}) {
  const bin = mkdtempSync(join(tmpdir(), 'tutorbin-'));
  if (fakeClaude) { writeFileSync(join(bin, 'claude'), `#!/bin/sh\n${fakeClaude}\n`); chmodSync(join(bin, 'claude'), 0o755); }
  const srv = spawn(process.execPath, ['scripts/tutor.mjs'], { env: { ...process.env, PORT: '0', PATH: `${bin}:/bin:/usr/bin`, ...extraEnv } });
  const port = await new Promise((res, rej) => {
    srv.stdout.on('data', (d) => { const m = String(d).match(/:(\d+)\//); if (m) res(m[1]); });
    srv.on('exit', () => rej(new Error('server exited')));
  });
  return { base: `http://127.0.0.1:${port}`, srv, stop: () => srv.kill() };
}
const askBody = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ok) };

test('ask fails cleanly when CLI missing', async () => {
  const t = await startTutor(null);
  try { assert.equal((await fetch(`${t.base}/api/ask`, askBody)).status, 503); } finally { t.stop(); }
});

test('CLI error output is not sent as a reply', async () => {
  const t = await startTutor('echo "Error: usage limit reached"; exit 1');
  try {
    const r = await fetch(`${t.base}/api/ask`, askBody);
    assert.equal(r.status, 503);
    assert.doesNotMatch(await r.text(), /usage limit/);
  } finally { t.stop(); }
});

test('a hung CLI gets a 503 at the timeout', async () => {
  const t = await startTutor('sleep 30', { TUTOR_TIMEOUT_MS: '500' });
  try {
    const t0 = Date.now();
    const r = await fetch(`${t.base}/api/ask`, askBody);
    assert.equal(r.status, 503);
    assert.ok(Date.now() - t0 < 5000);
  } finally { t.stop(); }
});

test('a good reply comes back whole', async () => {
  const t = await startTutor('cat >/dev/null; echo "Think about how many dogs are left."');
  try {
    const r = await fetch(`${t.base}/api/ask`, askBody);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /dogs are left/);
  } finally { t.stop(); }
});

test('bad requests do not crash the server', async () => {
  const t = await startTutor(null);
  try {
    assert.equal((await fetch(`${t.base}/%E0%A4%A`)).status, 404);
    await new Promise((res) => { // a raw request with an invalid absolute-form URL
      const s = connect(Number(new URL(t.base).port), '127.0.0.1', () => s.end('GET http://[bad/ HTTP/1.1\r\nHost: x\r\n\r\n'));
      s.on('close', res); s.on('error', res); s.resume();
    });
    await new Promise((res) => { // body cut off mid-upload
      const s = connect(Number(new URL(t.base).port), '127.0.0.1', () => { s.write('POST /api/ask HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 500\r\n\r\n{"pa'); setTimeout(() => { s.destroy(); res(); }, 100); });
      s.on('error', res);
    });
    await new Promise((r) => setTimeout(r, 200));
    assert.equal((await fetch(`${t.base}/api/health`)).status, 200);
  } finally { t.stop(); }
});
