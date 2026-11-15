// Keeps each review form's help.json in step with the questions on its page.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/** Question ids on a page: part numeral + "-" + question number, and "III" for a part's .task. Same rule as math/help.js. */
export function questionIds(html) {
  return html.split('<section class="part">').slice(1).flatMap((part, i) => [
    ...[...part.matchAll(/<span class="n">(\d+)\.<\/span>/g)].map((m) => `${ROMAN[i]}-${m[1]}`),
    ...(part.includes('class="task"') ? [ROMAN[i]] : []),
  ]);
}

/** Each question id's answer-key HTML: every .ans between its number and the next question
 *  (a question with parts a and b has two), joined with " / ". Same ids as questionIds(). */
export function answerKeys(html) {
  return Object.fromEntries(html.split('<section class="part">').slice(1).flatMap((part, i) => {
    const marks = [...part.matchAll(/<span class="n">(\d+)\.<\/span>|class="task"/g)];
    return marks.map((m, j) => [m[1] ? `${ROMAN[i]}-${m[1]}` : ROMAN[i],
      [...part.slice(m.index, marks[j + 1]?.index).matchAll(/<div class="ans">([\s\S]*?)<\/div>/g)].map((a) => a[1]).join(' / ')]);
  }).filter(([, key]) => key));
}

export function helpErrors(html, help, lessons) {
  const ids = questionIds(html), entries = help?.entries || {}, errs = [];
  const keys = answerKeys(html);
  for (const id of ids) if (!keys[id]) errs.push(`${id}: no answer (.ans)`);
  for (const id of ids) if (!entries[id]) errs.push(`${id}: no help entry`);
  for (const [id, e] of Object.entries(entries)) {
    if (!ids.includes(id)) errs.push(`${id}: not a question on the page`);
    if (!Array.isArray(e.hints) || e.hints.length !== 3 || e.hints.some((h) => typeof h !== 'string' || !h.trim())) errs.push(`${id}: needs exactly 3 hints`);
    if (!lessons[e.lesson]) errs.push(`${id}: lesson "${e.lesson}" is not in math/lessons.json`);
    if (!e.tag || !e.skill) errs.push(`${id}: needs a tag and a skill`);
  }
  return errs;
}

/** Errors for every math/<page>/help.json, as "page: message". */
export function checkAllHelp() {
  const MATH = join(ROOT, 'math');
  const lessons = JSON.parse(readFileSync(join(MATH, 'lessons.json'), 'utf8'));
  return readdirSync(MATH).filter((d) => existsSync(join(MATH, d, 'help.json'))).flatMap((d) => {
    const html = readFileSync(join(MATH, d, 'index.html'), 'utf8');
    return helpErrors(html, JSON.parse(readFileSync(join(MATH, d, 'help.json'), 'utf8')), lessons).map((e) => `math/${d}/help.json ${e}`);
  });
}
