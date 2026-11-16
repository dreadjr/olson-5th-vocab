// Draft "why that choice is tempting" notes for each wrong multiple-choice option, with the Claude CLI.
// Writes them into math/<form>/help.json as entry.wrong = {"A": "...", ...}. Review the output; `bun run check` validates it.
// Usage: node scripts/gen-wrong.mjs b4-form-c [b4-form-b …]   (only fills questions that don't have notes yet)
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { ROOT } from './lib.mjs';
import { questionIds, answerKeys } from './help-check.mjs';
import { cliCommand } from './tutor-lib.mjs';

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const plain = (h) => h.replace(/<span class="f"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, '$1/$2').replace(/<sup>([^<]*)<\/sup>/g, '^$1')
  .replace(/<svg[\s\S]*?<\/svg>/g, ' [graph] ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Each question's text (choices included, answer key left out), by id. */
function questionTexts(html) {
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

const EMPTY = mkdtempSync(join(tmpdir(), 'gen-wrong-'));
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
  const help = JSON.parse(readFileSync(join(dir, 'help.json'), 'utf8'));
  const keys = answerKeys(html), texts = questionTexts(html);
  const jobs = questionIds(html).flatMap((id) => {
    const key = plain((keys[id] || '').replace(/<span class="src">[^<]*<\/span>/g, ''));
    const right = key.match(/^([A-H](?:\s*,\s*[A-H])*)(?![a-z])/)?.[1];
    const letters = [...new Set((texts[id].match(/(?:^|\s)([A-H])\.\s/g) || []).map((x) => x.trim()[0]))];
    if (!right || right.includes(',') || letters.length < 3 || help.entries[id]?.wrong) return []; // single-answer multiple choice only
    return [{ id, right, wrongs: letters.filter((l) => l !== right), text: texts[id], key }];
  });
  console.log(`${form}: ${jobs.length} questions to draft`);
  for (let i = 0; i < jobs.length; i += 4) {
    await Promise.all(jobs.slice(i, i + 4).map(async (j) => {
      const prompt = [
        'You write feedback for a 7th grader who picked a WRONG choice on a multiple-choice math question.',
        `For each of these wrong choices: ${j.wrongs.join(', ')}, write ONE sentence (at most 25 words) naming the likely mistake that leads to that choice, in plain kid language.`,
        'Never say which choice is right, never state the correct value, and never mention the other choices. Use a/b for fractions and · for times.',
        'Reply with only a JSON object, like {"A": "…", "B": "…"}.',
        '',
        `Question: ${j.text}`,
        `Answer key (secret): ${j.right}. ${j.key}`,
      ].join('\n');
      const reply = await run(prompt);
      try {
        const obj = JSON.parse(reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1));
        const wrong = Object.fromEntries(j.wrongs.filter((l) => typeof obj[l] === 'string' && obj[l].trim()).map((l) => [l, obj[l].trim()]));
        if (Object.keys(wrong).length === j.wrongs.length) { help.entries[j.id].wrong = wrong; console.log(`  ${j.id} ok`); } else console.log(`  ${j.id} incomplete reply, skipped`);
      } catch { console.log(`  ${j.id} no JSON, skipped`); }
    }));
  }
  writeFileSync(join(dir, 'help.json'), JSON.stringify(help, null, 2) + '\n');
}
