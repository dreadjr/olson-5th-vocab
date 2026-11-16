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
      assert.equal(Practice.check(p, p.answer ?? p.choice), true, `${kind} #${seed}: own answer ${p.answer ?? p.choice}`);
      if (p.answer && !/[=(,]/.test(p.answer)) assert.equal(Practice.check(p, `${p.answer}+1`), false, `${kind} #${seed}: off by one accepted`);
      if (p.choice) assert.equal(Practice.check(p, p.choice === 'yes' ? 'no' : 'yes'), false);
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
