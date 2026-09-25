// Build every word set into its own standalone page, plus a library page.
//   dist/index.html          list of all sets
//   dist/<slug>/index.html   the game for one set (works offline, no other files needed)
//   dist/sets.json           machine-readable list of sets
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSets } from './lib.mjs';

const DIST = join(ROOT, 'dist');
const TEMPLATE = readFileSync(join(ROOT, 'src', 'template.html'), 'utf8');
const LIBRARY = readFileSync(join(ROOT, 'src', 'library.html'), 'utf8');

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// JSON that is safe to drop inside a <script> tag.
const scriptJson = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// Top bar on each game page: link home plus a dropdown to jump to another word list.
function setNav(current) {
  const opts = sets.map(s => `<option value="${esc(s.slug)}"${s.slug === current.slug ? ' selected' : ''}>${esc(s.title)}</option>`).join('');
  return `<nav class="setnav"><a class="back" href="../">&larr; All <span class="wide">word </span>sets</a>`
    + `<label class="picker"><span class="sr">Word list</span>`
    + `<select onchange="location.href='../'+encodeURIComponent(this.value)+'/'">${opts}</select></label></nav>`;
}

function fill(tpl, vars) {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) {
    if (!out.includes(k)) throw new Error(`Template is missing placeholder ${k}`);
    out = out.split(k).join(v);
  }
  return out;
}

let sets;
try {
  sets = loadSets();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
if (!sets.length) {
  console.error('No word sets found in sets/. Add one with: npm run new -- <name>');
  process.exit(1);
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

for (const set of sets) {
  const html = fill(TEMPLATE, {
    '{{PAGE_TITLE}}': esc(`Word Works — ${set.title}`),
    '{{SUBTITLE}}': esc(`${set.title} · ${set.subtitle || `${set.words.length} words`}`),
    '{{BACK_LINK}}': sets.length > 1 ? setNav(set) : '',
    '/*{{SET_JSON}}*/null': scriptJson({ slug: set.slug, title: set.title, words: set.words }),
  });
  mkdirSync(join(DIST, set.slug), { recursive: true });
  writeFileSync(join(DIST, set.slug, 'index.html'), html);
}

const items = sets.map(s => `
      <li>
        <a class="set" href="${esc(s.slug)}/">
          <span class="t">${esc(s.title)}</span>
          ${s.subtitle ? `<span class="s">${esc(s.subtitle)}</span>` : ''}
          <span class="chips"><span class="chip">${s.words.length} words</span>${s.date ? `<span class="chip">${esc(fmtDate(s.date))}</span>` : ''}</span>
        </a>
      </li>`).join('');
writeFileSync(join(DIST, 'index.html'), fill(LIBRARY, { '{{SET_ITEMS}}': items }));

writeFileSync(join(DIST, 'sets.json'), JSON.stringify(
  sets.map(s => ({ slug: s.slug, title: s.title, subtitle: s.subtitle, date: s.date, count: s.words.length, path: `${s.slug}/` })),
  null, 2) + '\n');

// Keep GitHub Pages from running Jekyll over the output.
writeFileSync(join(DIST, '.nojekyll'), '');

console.log(`Built ${sets.length} word set${sets.length === 1 ? '' : 's'} into dist/:`);
for (const s of sets) console.log(`  dist/${s.slug}/index.html  (${s.title}, ${s.words.length} words)`);
