// Create a new word set file in sets/.
//
//   npm run new -- m1w3 --title "Module 1, Week 3" --from words.txt
//   pbpaste | npm run new -- m1w3 --title "Module 1, Week 3"
//
// words.txt has one word per line, e.g.  "irrigate | To supply water to land or crops."
// (tab, |, " - ", ":" or "=" all work as the separator). With no word list, it
// writes an empty set to fill in by hand.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SETS_DIR, slugify, parseWordLines, validateSet } from './lib.mjs';

const args = process.argv.slice(2);
const opts = { force: false };
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--force') opts.force = true;
  else if (a.startsWith('--')) {
    const key = a.slice(2);
    const val = args[++i];
    if (val === undefined) die(`${a} needs a value`);
    opts[key] = val;
  } else positional.push(a);
}

function die(msg) {
  console.error(msg);
  console.error('\nUsage: npm run new -- <name> [--title "Module 1, Week 3"] [--subtitle "..."] [--date 2026-10-02] [--from words.txt] [--force]');
  process.exit(1);
}

const name = positional[0] || opts.title;
if (!name) die('Give the set a name, e.g. npm run new -- m1w3');
const slug = slugify(name);
if (!slug) die(`Can't make a file name from "${name}"`);

const file = join(SETS_DIR, `${slug}.json`);
if (existsSync(file) && !opts.force) die(`sets/${slug}.json already exists. Add --force to replace it.`);

let text = '';
if (opts.from) {
  text = readFileSync(opts.from, 'utf8');
} else if (!process.stdin.isTTY) {
  text = readFileSync(0, 'utf8');
}

const { words, skipped } = parseWordLines(text);
const set = {
  title: opts.title || name,
  ...(opts.subtitle ? { subtitle: opts.subtitle } : {}),
  date: opts.date || new Date().toISOString().slice(0, 10),
  words: words.length ? words : [1, 2, 3, 4].map(() => ({ word: '', definition: '' })),
};

// Pretty-print with one word per line so the file is easy to edit by hand.
const head = Object.entries(set).filter(([k]) => k !== 'words')
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
const body = set.words.map(w => `    { "word": ${JSON.stringify(w.word)}, "definition": ${JSON.stringify(w.definition)} }`).join(',\n');
writeFileSync(file, `{\n${head}\n  "words": [\n${body}\n  ]\n}\n`);
console.log(`Wrote sets/${slug}.json with ${words.length} word${words.length === 1 ? '' : 's'}.`);
if (skipped.length) {
  console.log(`\nSkipped ${skipped.length} line(s) with no separator between word and meaning:`);
  for (const l of skipped) console.log(`  ${l}`);
}
const problems = validateSet(set, slug);
if (problems.length) {
  console.log('\nStill to fix before it will build:');
  for (const p of problems) console.log(`  - ${p}`);
} else {
  console.log('Run "npm run build" to generate the page.');
}
