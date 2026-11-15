import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../math/calc.js');
const { evalLines } = globalThis.Calc;
const one = (line) => evalLines(line)[0];

test('exact fractions with their decimal', () => {
  assert.deepEqual(one('9/36'), { text: '1/4', hint: '= 0.25' });
  assert.deepEqual(one('1/6 * 1/6 * 1/6'), { text: '1/216', hint: '≈ 0.00462962963' });
  assert.deepEqual(one('1/3'), { text: '1/3', hint: '≈ 0.3333333333' });
  assert.equal(one('24/60 * 500').text, '200');
  assert.equal(one('0.1 + 0.2').text, '3/10');
  assert.equal(one('9 · 8').text, '72');
  assert.equal(one('6 x 6 x 6').text, '216');
  assert.equal(one('2(3+4)').text, '14');
  assert.equal(one('-2^2').text, '-4');
  assert.equal(one('2^-2').text, '1/4');
  assert.equal(one('7 ÷ 2').text, '7/2');
});

test('percents', () => {
  assert.equal(one('20% of 80').text, '16');
  assert.equal(one('3/4 as %').text, '75%');
  assert.equal(one('1/3 as %').text, '≈ 33.33333333%');
  assert.equal(one('1/8 as decimal').text, '0.125');
});

test('statistics match the Block 4 answer keys', () => {
  assert.deepEqual(one('median(20 25 30 30 35 35 40 45)'), { text: '65/2', hint: '= 32.5' });
  assert.equal(one('mean(2, 8, 15, 22, 28)').text, '15');
  assert.equal(one('mad(2 8 15 22 28)').text, '8');
  assert.equal(one('range(12 14 15 16 18)').text, '6');
  assert.equal(one('q1(1 2 3 4 5 6 7)').text, '2');
  assert.equal(one('q3(1 2 3 4 5 6 7)').text, '6');
  assert.equal(one('q1(1 2 3 4 5 6 7 8)').text, '5/2');
  assert.equal(one('iqr(1 2 3 4 5 6 7 8)').text, '4');
  assert.equal(one('sqrt(16/9)').text, '4/3');
  assert.equal(one('round(2/3, 2)').text, '67/100');
});

test('names, ans, notes and errors', () => {
  const r = evalLines('Ella’s fall students\np = 45/150\nc = 50/150\np * c\nans * 900\nfall: p * 100\n\n# a comment\n5 / 0\nq + 1\nmedian()');
  assert.deepEqual(r.slice(0, 4).map((x) => x.text), [undefined, '3/10', '1/3', '1/10']);
  assert.equal(r[4].text, '90');
  assert.equal(r[5].text, '30');
  assert.deepEqual(r[6], {});
  assert.deepEqual(r[7], {});
  assert.match(r[8].error, /divide by 0/);
  assert.match(r[9].error, /isn’t set/);
  assert.deepEqual(r[10], {}); // no digits: treated as a note, not an error
  assert.match(one('mean = 3').error, /already a word/);
  assert.match(one('3 +').error, /unfinished/);
});

test('solves proportions and one-unknown equations', () => {
  assert.equal(one('18/45=x/360').text, 'x = 144');
  assert.equal(one('45/18 = 360/x').text, 'x = 144');
  assert.equal(one('n/500 = 24/60').text, 'n = 200');
  assert.equal(one('3/x = 12/20').text, 'x = 5');
  assert.equal(one('2x + 3 = 15').text, 'x = 6');
  assert.deepEqual(one('4/7 = 10/y'), { text: 'y = 35/2', hint: '= 17.5' });
  assert.equal(one('x% of 80 = 20').text, 'x = 25');
  const r = evalLines('18/45 = x/360\nx * 2\np = 3/10\np = x/900');
  assert.deepEqual(r.map((v) => v.text), ['x = 144', '288', '3/10', '4/25']); // a name alone on the left is always an assignment: p = 144/900
  assert.match(one('x/4 = 3/x').error, /can’t solve/);
  assert.match(one('a/b = 3/4').error, /more than one unknown/);
  assert.match(one('3 = 4 = 5').error, /only one/);
  assert.match(one('mean = 3').error, /already a word/);
});

test('each equation solves fresh, even after its letter was found above', () => {
  assert.deepEqual(evalLines('18/45 = x/360\n45/18 = 360/x\n2x + 3 = 15\nx + 1').map((v) => v.text), ['x = 144', 'x = 144', 'x = 6', '7']);
  assert.match(evalLines('a = 2\nb = 3\na/b = 4/6')[2].error, /nothing to solve for/);
});
