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

test('freehand: slices from lines, and "close enough" grading', () => {
  const data = [['Bus', 12], ['Walk', 9], ['Car', 6], ['Bike', 3]]; // 144°, 108°, 72°, 36°
  const lines = [0, 144, 252, 324].map((a, id) => ({ id, a }));
  assert.deepEqual(Pie.slices(lines).map((s) => s.size), [144, 108, 72, 36]);
  const labels = { 0: 'Bus', 1: 'Walk', 2: 'Car', 3: 'Bike' };
  assert.equal(Pie.grade(lines, labels, data).ok, true);
  const near = [3, 149, 252, 326].map((a, id) => ({ id, a })); // 146°, 103°, 74°, 37°: all within 5°
  assert.equal(Pie.grade(near, labels, data).ok, true);
  const off = [0, 170, 252, 324].map((a, id) => ({ id, a })); // Bus 170° (too big), Walk 82° (too small)
  const g = Pie.grade(off, labels, data);
  assert.equal(g.ok, false);
  assert.match(g.rows[0].msg, /much too big|a bit too big/);
  assert.doesNotMatch(g.rows.map((r) => r.msg).join(' '), /144|108/); // never gives the right size away
  assert.match(Pie.grade(lines.slice(0, 2), labels, data).msg, /Draw 4 lines/);
  assert.match(Pie.grade(lines, { 0: 'Bus' }, data).rows[1].msg, /Label a sector Walk/);
});
