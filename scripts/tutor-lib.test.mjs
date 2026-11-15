import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
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

test('cliCommand', () => {
  const c = cliCommand({});
  assert.equal(c.cmd, 'claude');
  for (const a of ['--tools', '', '--no-session-persistence']) assert.ok(c.args.includes(a), a);
  const x = cliCommand({ TUTOR_CLI: 'codex' });
  assert.equal(x.cmd, 'codex');
  assert.ok(x.args.includes('exec'));
});

test('ask fails cleanly when CLI missing', async () => {
  const srv = spawn(process.execPath, ['scripts/tutor.mjs'], {
    env: { ...process.env, PORT: '0', PATH: mkdtempSync(join(tmpdir(), 'nocli-')) },
  });
  try {
    const port = await new Promise((res, rej) => {
      srv.stdout.on('data', (d) => { const m = String(d).match(/:(\d+)\//); if (m) res(m[1]); });
      srv.on('exit', () => rej(new Error('server exited')));
    });
    const r = await fetch(`http://127.0.0.1:${port}/api/ask`, { method: 'POST', body: JSON.stringify(ok) });
    assert.equal(r.status, 503);
  } finally { srv.kill(); }
});
