import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from './schoology.mjs';

test('normalize reads Schoology score cells', () => {
  const n = normalize({ course: 'PRE-ALGEBRA 2: (YR) Mueller', category: 'Quizzes', title: 'P&P 4.6 & 4.7 Exit Quiz', score: '8 / 8This student has completed the test/quiz', due: '11/6/26 11:59pm' });
  assert.deepEqual([n.course, n.earned, n.max, n.pct, n.due, n.lessons], ['PRE-ALGEBRA 2', 8, 8, 100, '2026-11-06', ['4.6', '4.7']]);
  assert.equal(normalize({ course: 'X', title: 'Lab', score: '0Missing' + 'This student has made a submission that has not been graded.' }).missing, true);
  assert.equal(normalize({ course: 'X', title: 'Quiz', score: '5 / 5', comment: 'Comment:' }).comment, '');
  assert.equal(normalize({ course: 'X', title: 'Essay', score: '—This student has made a submission that has not been graded.' }).waiting, true);
  assert.equal(normalize({ course: 'X', title: 'Poster', score: 'NClick to launch rubrics popup.'.replace('N', '3') + '9 / 10' }).pct, 90);
});
