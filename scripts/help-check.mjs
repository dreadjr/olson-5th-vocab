// Keeps each review form's help.json in step with the questions on its page.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
await import('../math/calc.js'); // globalThis.Calc: the same answer comparison the pages use
const { equivalent } = globalThis.Calc;

/** Does the answer key (HTML) mention a value equivalent to this clean answer? */
export function keyMentions(answer, keyHtml) {
  const text = keyHtml.replace(/<span class="src">[^<]*<\/span>/g, '')
    .replace(/<span class="f"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, '($1)/($2)').replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ').replace(/[−–]/g, '-');
  const cands = [
    ...text.matchAll(/\(\s*-?[\d./()]+\s*,\s*-?[\d./()]+\s*\)/g),
    ...text.matchAll(/[a-z]\s*=\s*-?\(?[\d.]*\)?(?:\/\(?\d+\)?)?\s*[a-z]?/gi),
    ...text.matchAll(/\(\d+(?:\.\d+)?\)\/\(\d+(?:\.\d+)?\)/g), // stacked fractions, written (a)/(b) above
    ...text.matchAll(/-?\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?|%)?/g),
  ].map((m) => m[0].trim());
  return cands.some((c) => equivalent(answer, c) === true);
}

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
    if (e.wrong !== undefined) {
      const right = (keys[id] || '').replace(/<span class="src">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, ' ').trim().match(/^([A-H])(?![a-z])/)?.[1];
      for (const [l, note] of Object.entries(e.wrong || {})) {
        if (!/^[A-H]$/.test(l)) errs.push(`${id}: "wrong" has a key "${l}" that isn't a choice letter`);
        else if (l === right) errs.push(`${id}: "wrong" has a note for ${l}, the right answer`);
        if (typeof note !== 'string' || !note.trim() || note.length > 220) errs.push(`${id}: "wrong" note for ${l} must be 1 to 220 characters`);
      }
    }
    if (e.why !== undefined) { // YES/NO rows: how to work out each row ("2c": "..."), shown when that row is wrong
      for (const [row, note] of Object.entries(e.why || {})) {
        if (!/^\d+[a-z]$/.test(row) || !keys[id]?.includes(`${row} `)) errs.push(`${id}: "why" row ${row} isn't a YES/NO row in the key`);
        if (typeof note !== 'string' || !note.trim() || note.length > 220) errs.push(`${id}: "why" ${row} must be a sentence under 220 characters`);
        else if (/\b(YES|NO)\b/.test(note)) errs.push(`${id}: "why" ${row} gives away YES or NO`);
      }
    }
    if (e.parts !== undefined && !(Array.isArray(e.parts) && e.parts.length > 1 && e.parts.every((x) => typeof x === 'string' && x.trim() && x.length <= 120)))
      errs.push(`${id}: "parts" must list 2 or more short labels, one box each`);
    if (e.draw !== undefined && !(Array.isArray(e.draw) && e.draw.length > 1 && e.draw.length <= 6 && e.draw.every((r) => Array.isArray(r) && typeof r[0] === 'string' && Number.isInteger(r[1]) && r[1] > 0)))
      errs.push(`${id}: "draw" must be 2-6 ["label", whole count] pairs`);
    if (e.pie !== undefined && !(Array.isArray(e.pie) && e.pie.length > 1 && e.pie.length <= 6 && e.pie.every((r) => Array.isArray(r) && typeof r[0] === 'string' && Number.isInteger(r[1]) && r[1] >= 0)))
      errs.push(`${id}: "pie" must be 2-6 ["label", whole count] pairs`);
    if (e.fields !== undefined) { // a grid of boxes: rows × cols, each with its value ("none" etc. for words)
      const f = e.fields, ok = f && Array.isArray(f.rows) && Array.isArray(f.cols) && Array.isArray(f.answers) && f.answers.length === f.rows.length && f.answers.every((r) => Array.isArray(r) && r.length === f.cols.length);
      if (!ok) errs.push(`${id}: "fields" needs rows, cols and an answers row per row with a value per col`);
      else for (const v of f.answers.flat()) {
        if (typeof v !== 'string' || !v.trim()) errs.push(`${id}: "fields" has an empty answer`);
        else if (equivalent(v, v) === true ? keys[id] && !keyMentions(v, keys[id]) : keys[id] && !keys[id].toLowerCase().includes(v.toLowerCase().split('|')[0])) errs.push(`${id}: "fields" answer ${v} isn't in the answer key`);
      }
    }
    if (e.answer !== undefined) {
      if (typeof e.answer !== 'string' || !e.answer.trim() || e.answer.length > 40) errs.push(`${id}: "answer" must be a short string`);
      else if (equivalent(e.answer, e.answer) !== true) errs.push(`${id}: "answer" ${e.answer} isn't math the checker can read`);
      else if (keys[id] && !keyMentions(e.answer, keys[id])) errs.push(`${id}: "answer" ${e.answer} doesn't match anything in the answer key`);
    }
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

// Question text for drafting help (scripts/gen-wrong.mjs, gen-help.mjs): the page's HTML as plain text.
export const plain = (h) => h.replace(/<span class="f"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, '$1/$2').replace(/<sup>([^<]*)<\/sup>/g, '^$1')
  .replace(/<svg[\s\S]*?<\/svg>/g, ' [graph] ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Each question's text (choices included, answer key left out), by id. */
export function questionTexts(html) {
  const out = {};
  html.split('<section class="part">').slice(1).forEach((part, i) => {
    const marks = [...part.matchAll(/<span class="n">(\d+)\.<\/span>|class="task"/g)];
    marks.forEach((m, j) => {
      const id = m[1] ? `${ROMAN[i]}-${m[1]}` : ROMAN[i];
      out[id] = plain(part.slice(m.index, marks[j + 1]?.index).replace(/<div class="ans">[\s\S]*?<\/div>/g, ''));
    });
  });
  return out;
}

