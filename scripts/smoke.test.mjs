// Smoke test in a real browser: the study UI (help.js, calc.js, writing.js) must actually come up on the pages.
// Unit tests don't run page scripts, so an error there would otherwise only show up in the browser.
// Needs the local Chrome (like `bun run math:pdf`); skipped when it isn't there (CI).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { serveDist } from './static.mjs';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const skip = !existsSync(CHROME) && 'Chrome not found (set CHROME=…)';
let server, base;

before(async () => {
  if (skip) return;
  execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: 'ignore' });
  server = createServer(serveDist);
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

// The page's DOM after its scripts ran (headless Chrome, a few seconds of virtual time).
const dom = (path) => new Promise((resolve, reject) => {
  const c = spawn(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=6000', '--dump-dom', base + path]);
  let out = '';
  c.stdout.on('data', (d) => { out += d; });
  c.on('error', reject);
  c.on('close', () => resolve(out));
});
const count = (html, needle) => html.split(needle).length - 1;

test('math forms get the study UI', { skip }, async () => {
  for (const [page, questions] of [['b4-form-c', 40], ['b5-form-b', 27]]) {
    const html = await dom(`/math/${page}/`);
    assert.equal(count(html, '<form class="answer'), questions, `${page}: an answer box per question (one per part a, b, …)`);
    assert.ok(count(html, 'class="q-tool"') >= questions * 2, `${page}: read aloud / key info / step by step`);
    assert.ok(html.includes('class="views"') && html.includes('class="calc-btn"'), `${page}: view switch and calculator`);
  }
});

test('a generated practice form has 12 problems', { skip }, async () => {
  const html = await dom('/math/gen/?block=4&seed=12345');
  assert.equal(count(html, 'class="gen-q"'), 12);
  assert.ok(html.includes('Form 12345'));
  assert.equal(count(await dom('/math/gen/?quiz=rne-3.5&seed=5'), 'class="gen-q"'), 8, 'quiz review: 4 questions, 2 rounds');
  assert.equal(count(await dom('/math/gen/?test=1&seed=5'), 'class="gen-q"'), 19, 'block 1 test review: every 1.x exit quiz');
  for (const b of ['1', '2', '3', 'rne']) assert.equal(count(await dom(`/math/gen/?block=${b}&seed=7`), 'class="gen-q"'), 12, `block ${b}`);
});

test('writing page lists the exercises', { skip }, async () => {
  const html = await dom('/writing/?mode=fix');
  assert.equal(count(html, 'class="card"'), 24);
});
