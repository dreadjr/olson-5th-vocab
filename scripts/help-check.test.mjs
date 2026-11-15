import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { questionIds, helpErrors } from './help-check.mjs';

const html = readFileSync(new URL('../math/b4-form-c/index.html', import.meta.url), 'utf8');
const lessons = { '4.5': {} };
const entry = { lesson: '4.5', tag: 't', skill: 's', hints: ['a', 'b', 'c'] };

test('questionIds reads Form C', () => {
  const ids = questionIds(html);
  assert.equal(ids.length, 32);
  assert.deepEqual(ids.slice(0, 12), [...Array.from({ length: 11 }, (_, i) => `I-${i + 1}`), 'II-1']);
  assert.equal(ids.at(-1), 'III');
});

test('helpErrors', () => {
  const page = '<section class="part"><div class="q"><span class="n">1.</span></div><div class="q"><span class="n">2.</span></div></section>';
  assert.deepEqual(helpErrors(page, { entries: { 'I-1': entry, 'I-2': entry } }, lessons), []);
  assert.ok(helpErrors(page, { entries: { 'I-1': entry } }, lessons).some((e) => e.includes('I-2')));
  assert.ok(helpErrors(page, { entries: { 'I-1': entry, 'I-2': { ...entry, hints: ['a', 'b'] } } }, lessons).length);
  assert.ok(helpErrors(page, { entries: { 'I-1': entry, 'I-2': { ...entry, lesson: '9.9' } } }, lessons).length);
});
