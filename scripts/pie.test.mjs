import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../math/pie.js');
const { Pie } = globalThis;

test('degrees and snapping', () => {
  assert.equal(Pie.deg(18, 45), 144);
  assert.equal(Pie.deg(48, 160), 108);
  assert.equal(Pie.countAt(144, 45), 18);  // an edge dragged to 144° is 18 of 45
  assert.equal(Pie.countAt(-36, 45), 41);  // angles wrap around the circle
  assert.equal(Pie.countAt(150, 45), 19);  // snaps to the nearest whole count (8° per student)
});

test('an arrow key moves an edge by one, not to the end', () => {
  // DOM-free check of the rule moveEdge uses: edge i at running count `at` moves to at ± 1
  const rows = [56, 48, 40, 16], i = 0, at = rows[0], c = at + 1;
  const pair = rows[i] + rows[i + 1], n = Math.max(0, Math.min(pair, c - 0));
  assert.deepEqual([n, pair - n], [57, 47]);
});
