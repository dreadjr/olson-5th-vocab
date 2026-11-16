import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { questionIds, helpErrors, answerKeys } from './help-check.mjs';

const html = readFileSync(new URL('../math/b4-form-c/index.html', import.meta.url), 'utf8');
const lessons = { '4.5': {} };
const entry = { lesson: '4.5', tag: 't', skill: 's', hints: ['a', 'b', 'c'] };

test('questionIds reads Form C', () => {
  const ids = questionIds(html);
  assert.equal(ids.length, 38);
  assert.deepEqual(ids.slice(0, 12), [...Array.from({ length: 11 }, (_, i) => `I-${i + 1}`), 'II-1']);
  assert.equal(ids.at(-1), 'V-4'); // Part IV: pie charts, Part V: exit quiz review
});

test('helpErrors', () => {
  const page = '<section class="part"><div class="q"><span class="n">1.</span><div class="ans">a</div></div><div class="q"><span class="n">2.</span><div class="ans">b</div></div></section>';
  assert.deepEqual(helpErrors(page, { entries: { 'I-1': entry, 'I-2': entry } }, lessons), []);
  assert.ok(helpErrors(page, { entries: { 'I-1': entry } }, lessons).some((e) => e.includes('I-2')));
  assert.ok(helpErrors(page, { entries: { 'I-1': entry, 'I-2': { ...entry, hints: ['a', 'b'] } } }, lessons).length);
  assert.ok(helpErrors(page, { entries: { 'I-1': entry, 'I-2': { ...entry, lesson: '9.9' } } }, lessons).length);
});

test('answerKeys pairs each question with its answer', () => {
  const keys = answerKeys(html);
  assert.equal(Object.keys(keys).length, 38);
  assert.match(keys['I-6'], /72/);
  assert.match(keys.III, /90 students/);
  assert.match(Object.values(keys).find((k) => k.includes('40 plants')), /40 plants \/ .*7/);
  const page = '<section class="part"><div class="q"><span class="n">1.</span><div class="ans">x</div></div><div class="q"><span class="n">2.</span></div></section>';
  assert.ok(helpErrors(page, { entries: {} }, lessons).some((e) => e.includes('answer')));
});

test('clean answers must match the key', async () => {
  const { keyMentions } = await import('./help-check.mjs');
  assert.equal(keyMentions('72', 'C (9 choices for first · 8 left for second = 72)'), true);
  assert.equal(keyMentions('1/3', '<span class="f"><span>4</span><span>12</span></span> = <span class="f"><span>1</span><span>3</span></span> (9, 10, 11, 12)'), true);
  assert.equal(keyMentions('y = 12x', 'y = 12x (m = y ÷ x = 12 ÷ 1 = 12)'), true);
  assert.equal(keyMentions('(2, -5)', '(2, −5)'), true);
  assert.equal(keyMentions('90', 'P = 1/10. Prediction: 1/10 · 900 = 90 students.'), true);
  assert.equal(keyMentions('81', 'C (9 · 8 = 72)'), false);
  const page = '<section class="part"><div class="q"><span class="n">1.</span><div class="ans">C (= 72)</div></div></section>';
  const base = { lesson: '4.5', tag: 't', skill: 's', hints: ['a', 'b', 'c'] };
  assert.deepEqual(helpErrors(page, { entries: { 'I-1': { ...base, answer: '72' } } }, lessons), []);
  assert.ok(helpErrors(page, { entries: { 'I-1': { ...base, answer: '81' } } }, lessons)[0].includes('answer key'));
  assert.ok(helpErrors(page, { entries: { 'I-1': { ...base, answer: 'lots' } } }, lessons)[0].includes('can read'));
});

test('wrong-choice notes: letters only, never for the right answer', () => {
  const page = '<section class="part"><div class="q"><span class="n">1.</span><div class="ans">C (= 72)</div></div></section>';
  const base = { lesson: '4.5', tag: 't', skill: 's', hints: ['a', 'b', 'c'] };
  assert.deepEqual(helpErrors(page, { entries: { 'I-1': { ...base, wrong: { D: '9 · 9 lets the same dog win twice.' } } } }, lessons), []);
  assert.ok(helpErrors(page, { entries: { 'I-1': { ...base, wrong: { C: 'x' } } } }, lessons)[0].includes('right answer'));
  assert.ok(helpErrors(page, { entries: { 'I-1': { ...base, wrong: { Z: 'x' } } } }, lessons)[0].includes('choice letter'));
});
