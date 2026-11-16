// Draft help.json for a review form that has none: each question's lesson, skill, 3 hints (a nudge, a worked
// example with other numbers, this question solved) and, when there is exactly one numeric answer, "answer" for the
// on-page check. Uses the Claude CLI (like gen-wrong.mjs). Drafts are checked by `bun run check`; a drafted
// "answer" that the checker can't match to the answer key is dropped.
// Usage: node scripts/gen-help.mjs b1-form-b [b1-form-c …]   (keeps entries already there, so it can resume)
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ROOT } from './lib.mjs';
import { questionIds, answerKeys, plain, questionTexts, helpErrors } from './help-check.mjs';
import { cliCommand } from './tutor-lib.mjs';

const lessons = JSON.parse(readFileSync(join(ROOT, 'math', 'lessons.json'), 'utf8'));
// The first complete {...} in a reply (some replies add a note after the JSON).
function firstJson(s) {
  const i = s.indexOf('{');
  let depth = 0, str = false, esc = false;
  for (let k = i; k >= 0 && k < s.length; k++) {
    const ch = s[k];
    if (str) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') str = false; continue; }
    if (ch === '"') str = true; else if (ch === '{') depth++; else if (ch === '}' && --depth === 0) return s.slice(i, k + 1);
  }
  return '';
}
const EMPTY = mkdtempSync(join(tmpdir(), 'gen-help-'));
const run = (prompt) => new Promise((resolve) => {
  const { cmd, args } = cliCommand(process.env);
  const c = spawn(cmd, args, { cwd: EMPTY, stdio: ['pipe', 'pipe', 'ignore'] }); // an empty folder: no repo files or memory
  let out = '';
  c.stdout.on('data', (d) => { out += d; });
  c.on('close', (code) => resolve(code === 0 ? out : ''));
  c.on('error', () => resolve(''));
  c.stdin.end(prompt);
});

for (const form of process.argv.slice(2)) {
  const dir = join(ROOT, 'math', form);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const file = join(dir, 'help.json');
  const help = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { entries: {} };
  const block = (html.match(/"block":(\d+)/) || [])[1];
  const list = Object.entries(lessons).filter(([n]) => n.split('.')[0] === block).map(([n, l]) => `${n} ${l.title}`).join('; ');
  const keys = answerKeys(html), texts = questionTexts(html);
  const save = () => writeFileSync(file, JSON.stringify(help, null, 2) + '\n');
  const todo = questionIds(html).filter((id) => !help.entries[id]);
  console.log(`${form}: ${todo.length} questions to draft (lessons ${list})`);
  for (let i = 0; i < todo.length; i += 6) {
    await Promise.all(todo.slice(i, i + 6).map(async (id) => {
      const key = plain((keys[id] || '').replace(/<span class="src">[^<]*<\/span>/g, ''));
      const prompt = [
        'You write help for a 7th grader working a math review question (Core Focus on Proportions & Probability).',
        `Pick the lesson it practices from this list: ${list}.`,
        'Write exactly 3 hints, each at most 300 characters, in plain kid language:',
        '1) what to notice or the first step, without giving the answer;',
        '2) a worked example of the same kind with DIFFERENT numbers, starting "Example:";',
        '3) this exact question solved step by step, ending with the answer (for multiple choice say which letter, e.g. "The answer is C.").',
        'Use a/b for fractions and · for times. Do not use LaTeX or markdown.',
        'Also give "skill": a short name for the skill (2-6 words).',
        'And "answer": ONLY if the whole question has exactly one numeric answer (a number, a fraction like 3/4, or a decimal), give it as that value with no units; otherwise null. Never for multiple choice, ratios, explanations or several answers.',
        'Reply with only a JSON object: {"lesson": "1.3", "skill": "…", "hints": ["…", "…", "…"], "answer": null}',
        '',
        `Question: ${texts[id]}`,
        `Answer key: ${key}`,
      ].join('\n');
      const reply = await run(prompt);
      try {
        const o = JSON.parse(firstJson(reply).replace(/,\s*([\]}])/g, "$1")); // tolerate a trailing comma
        if (Array.isArray(o.hints) && o.hints.length > 3) o.hints = o.hints.slice(0, 3);
        if (!lessons[o.lesson] || !Array.isArray(o.hints) || o.hints.length !== 3 || !o.skill) throw new Error(`bad shape: lesson ${o.lesson}, ${o.hints?.length} hints, skill ${!!o.skill}`);
        help.entries[id] = { lesson: o.lesson, tag: `Lesson ${o.lesson}`, skill: o.skill, hints: o.hints.map((h) => String(h).trim()), ...(o.answer != null && String(o.answer).trim() ? { answer: String(o.answer).trim() } : {}) };
        save();
        console.log(`  ${id} ok (${o.lesson} ${o.skill}${help.entries[id].answer ? `, answer ${help.entries[id].answer}` : ''})`);
      } catch (e) { console.log(`  ${id} no usable reply, skipped (run again to retry): ${reply ? `${e.message}; reply starts ${JSON.stringify(reply.slice(0, 160))}` : 'empty reply'}`); }
    }));
  }
  // keep entries in page order, and drop any drafted "answer" the checker can't match to the key
  help.entries = Object.fromEntries(questionIds(html).filter((id) => help.entries[id]).map((id) => [id, help.entries[id]]));
  for (const err of helpErrors(html, help, lessons)) {
    const m = err.match(/^([IVX]+(?:-\d+)?): "answer"/);
    if (m && help.entries[m[1]]) {
      const e = help.entries[m[1]];
      if (!/%$/.test(e.answer) && !helpErrors(html, { entries: { [m[1]]: { ...e, answer: `${e.answer}%` } } }, lessons).some((x) => x.startsWith(`${m[1]}: "answer"`))) { e.answer += '%'; console.log(`  ${m[1]}: answer is a percent, now ${e.answer}`); continue; }
      delete e.answer; console.log(`  ${m[1]}: dropped answer (${err.split(': ').slice(1).join(': ')})`);
    }
  }
  save();
}
