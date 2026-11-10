// Render every math review page to two PDFs with the local Chrome:
//   math/pdf/<slug>.pdf       blank test
//   math/pdf/<slug>-key.pdf   answer key (page opened with #key)
// Run locally (CI has no Chrome): npm run math:pdf [-- b4-form-b ...]
import { readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib.mjs';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MATH = join(ROOT, 'math');
const PDF = join(MATH, 'pdf');
if (!existsSync(CHROME)) { console.error(`Chrome not found at ${CHROME}. Set CHROME=/path/to/chrome.`); process.exit(1); }
mkdirSync(PDF, { recursive: true });

const only = process.argv.slice(2);
const slugs = readdirSync(MATH).filter(d => existsSync(join(MATH, d, 'index.html')) && (!only.length || only.includes(d)));
if (!slugs.length) { console.error('No math review pages found in math/<slug>/index.html'); process.exit(1); }

for (const slug of slugs) {
  const url = pathToFileURL(join(MATH, slug, 'index.html')).href;
  for (const [suffix, hash] of [['', ''], ['-key', '#key']]) {
    const out = join(PDF, `${slug}${suffix}.pdf`);
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=8000',
      `--print-to-pdf=${out}`, url + hash], { stdio: 'ignore' });
    if (!existsSync(out) || statSync(out).size < 1000) throw new Error(`Render failed: ${out}`);
    console.log(`  math/pdf/${slug}${suffix}.pdf`);
  }
}
