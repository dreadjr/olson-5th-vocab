import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../math/calc.js');
await import('../math/practice.js');
const { Practice } = globalThis;

test('every template makes sound problems whose answers check', () => {
  for (const kind of Object.keys(Practice.kinds)) {
    for (let seed = 1; seed <= 300; seed++) {
      const p = Practice.make(kind, seed);
      const all = [p.q, p.hint, ...p.steps, p.answer ?? p.choice].join(' ');
      assert.doesNotMatch(all, /NaN|undefined|Infinity|null/, `${kind} #${seed}: ${all}`);
      assert.ok(p.steps.length >= 2, `${kind}: needs steps`);
      const right = p.word ? `${p.word} ${p.answer}` : p.answer ?? p.choice;
      assert.equal(Practice.check(p, right), true, `${kind} #${seed}: own answer ${right}`);
      if (p.answer && !p.form && !p.word && !/[=(,%]|\d \d/.test(p.answer)) assert.equal(Practice.check(p, `${p.answer}+1`), false, `${kind} #${seed}: off by one accepted`);
      if (p.choice) assert.equal(Practice.check(p, (p.options || ['yes', 'no']).find((o) => o !== p.choice)), false, `${kind} #${seed}: other choice accepted`);
      if (p.word) assert.equal(Practice.check(p, `${p.options.find((o) => o !== p.word)} ${p.answer}`), false, `${kind} #${seed}: wrong direction accepted`);
    }
  }
});

test('same seed, same problem', () => {
  assert.deepEqual(Practice.make('no-repeat', 7), Practice.make('no-repeat', 7));
});

test('worked examples', () => {
  const p = Practice.make('no-repeat', 42);
  const [n] = p.q.match(/\d+/).map(Number);
  assert.ok(p.answer === String(n * (n - 1)) || p.answer === String(n * (n - 1) * (n - 2)));
  assert.equal(Practice.check({ answer: '1/4' }, '0.25'), true);
  assert.equal(Practice.check({ choice: 'no' }, 'No.'), true);
  assert.equal(Practice.check({ choice: 'no' }, 'maybe'), null);
});

test('skills map to templates; explain-why skills get none', () => {
  const want = { 'Counting with no repeats': 'no-repeat', 'Mean absolute deviation': 'mad', 'Capture/recapture': 'capture', 'Experimental probability as a percent': 'exp-prob',
    'Reading ordered pairs': 'ordered-pair', 'Equation from a table': 'dv-equation', 'Rate from a table': 'rate-table', 'Direct variation equations': 'dv-recognize',
    'Median of an even-sized set': 'median', 'Five-number summary': 'iqr', 'Mode, range and median': 'range', 'Using a direct variation equation': 'dv-solve',
    'Biased samples': null, 'Strong and weak inferences': null, 'Matching a story to a graph': null, 'Plotting points': null, 'Outliers and the best center': null };
  for (const [skill, kind] of Object.entries(want)) assert.equal(Practice.kindFor(skill), kind, skill);
});

test('answer forms people write', () => {
  const chk = (p, typed) => Practice.check(p, typed);
  assert.equal(chk({ answer: '0.12', form: 'decimal' }, '1.2'), false); // Quinn's place-value slip on −0.6 · −0.2
  assert.equal(chk({ answer: '0.12', form: 'decimal' }, '.12'), true);
  assert.equal(chk({ answer: '-81/8' }, '-10 1/8'), true);
  assert.equal(chk({ answer: '-81/8' }, '−10 1/8'), true);
  assert.equal(chk({ answer: '3:2', form: 'ratio' }, '3 to 2'), true);
  assert.equal(chk({ answer: '3:2', form: 'ratio' }, '6:4'), false); // not simplest
  assert.equal(chk({ answer: '25%' }, '25%'), true);
  assert.equal(chk({ answer: '25%' }, '25'), true);
  assert.equal(chk({ answer: '13.6' }, '$13.60'), true);
  assert.equal(chk({ answer: '20' }, '20 miles'), true);
  assert.equal(chk({ answer: '9' }, 'x = 9'), true);
  assert.equal(chk({ answer: '3/20', form: 'fraction' }, '0.15'), null); // asked for a fraction
  assert.equal(chk({ answer: '3x - 15', form: 'expr' }, '3x-15'), true);
  assert.equal(chk({ answer: '-12x - 2', form: 'expr' }, '-12x+2'), false);
  assert.equal(chk({ answer: '25%', word: 'increase', options: ['increase', 'decrease'] }, 'increase; 25%'), true);
  assert.equal(chk({ answer: '25%', word: 'increase', options: ['increase', 'decrease'] }, 'decrease 25%'), false);
  assert.equal(chk({ choice: 'dan', options: ['thomas', 'dan'] }, 'Dan spent less'), true);
});
