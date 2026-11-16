// Bring in grades saved from the Schoology parent page (schoology-<student>-<date>.json in ~/Downloads, made in Chrome
// from Grades > the student's report) and analyze them. Everything stays in data/schoology/ (gitignored, never deployed):
// a child's school data. Usage: node scripts/schoology.mjs   -> moves new downloads in, writes data/schoology/report.html
import { readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { ROOT } from './lib.mjs';

const DIR = join(ROOT, 'data', 'schoology');

/** One graded item, cleaned up: points, percent, missing, waiting for a grade, due date, textbook lessons in its title. */
export function normalize(i) {
  const pts = i.score.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  const earned = pts ? +pts[1] : null, max = pts ? +pts[2] : null;
  const due = i.due?.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  return {
    course: i.course.split(':')[0].trim(), category: i.category || '', title: i.title,
    earned, max, pct: pts && max ? Math.round((earned / max) * 1000) / 10 : null,
    missing: /Missing/i.test(i.score),
    waiting: /not been graded/i.test(i.score),
    comment: (i.comment || '').replace(/^Comment:\s*/i, '').trim(), // Schoology shows an empty "Comment:" label
    due: due ? `${due[3].length === 2 ? `20${due[3]}` : due[3]}-${due[1].padStart(2, '0')}-${due[2].padStart(2, '0')}` : null,
    lessons: [...i.title.matchAll(/\b(\d{1,2})\.(\d{1,2})\b/g)].map((m) => `${m[1]}.${m[2]}`),
  };
}

/** What the data says: grades by course and category, lowest scores, missing, comments, math by lesson. */
export function analyze(d) {
  const items = d.items.map(normalize);
  const graded = items.filter((i) => i.pct != null && !i.missing);
  const avg = (xs) => (xs.length ? Math.round((xs.reduce((s, i) => s + i.earned, 0) / xs.reduce((s, i) => s + i.max, 0)) * 1000) / 10 : null);
  const byLesson = {};
  for (const i of graded) for (const l of i.lessons) (byLesson[l] ||= []).push(i);
  return {
    student: d.student, at: d.at,
    courses: d.courses.map((c) => ({ course: c.course.split(':')[0].trim(), grade: c.grade, items: items.filter((i) => i.course === c.course.split(':')[0].trim()).length })),
    categories: d.categories.filter((c) => c.grade && c.grade !== '—').map((c) => ({ course: c.course.split(':')[0].trim(), category: c.category, grade: c.grade })),
    lowest: [...graded].filter((i) => i.pct < 85).sort((a, b) => a.pct - b.pct),
    missing: items.filter((i) => i.missing),
    waiting: items.filter((i) => i.waiting && !i.missing),
    comments: items.filter((i) => i.comment).sort((a, b) => (b.due || '').localeCompare(a.due || '')),
    lessons: Object.entries(byLesson).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([lesson, xs]) => ({ lesson, pct: avg(xs), items: xs.map((x) => `${x.title} (${x.earned}/${x.max})`) })),
  };
}

/** Each class's materials, summed up: syllabus (a saved PDF, a page or a link), units (top folders), item counts, pages. */
export function classes(m, pdfs = [], links = {}) {
  const merged = new Map(); // a class can show up under two ids (sections); keep the one with more in it
  for (const c of m.courses) {
    const name = c.course.split(':')[0].trim();
    if (!merged.has(name) || c.items.length > merged.get(name).items.length) merged.set(name, { ...c, name });
  }
  return [...merged.values()].map((c) => {
    const pdf = pdfs.find((p) => p.endsWith(`/${name2file(c.name)}.pdf`));
    return {
      course: c.name,
      syllabus: c.items.filter((i) => i.syllabus).map((i) => ({ title: i.title, type: i.type, pdf, text: i.text, link: i.links?.[0]?.url || (/syllab/i.test(i.title) ? links[c.name] : undefined) })),
      units: c.items.filter((i) => i.type === 'folder' && !i.path).map((i) => i.title),
      counts: c.items.reduce((t, i) => ((t[i.type] = (t[i.type] || 0) + 1), t), {}),
      pages: c.items.filter((i) => i.type === 'page' && i.text).map((i) => ({ title: i.title, path: i.path, text: i.text.slice(0, 240) })),
    };
  });
}
const name2file = (n) => n.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const row = (cells) => `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`;
const table = (head, rows) => (rows.length ? `<table><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${rows.map(row).join('')}</table>` : '<p class="none">None.</p>');

function report(all) {
  const body = all.map((a) => `<section><h2>${esc(a.student)} <small>from Schoology ${esc(a.at.slice(0, 10))}</small></h2>
<h3>Courses</h3>${table(['Course', 'Grade', 'Items'], a.courses.map((c) => [c.course, c.grade, c.items]))}
<h3>By category</h3>${table(['Course', 'Category', 'Grade'], a.categories.map((c) => [c.course, c.category, c.grade]))}
<h3>Missing</h3>${table(['Course', 'Item', 'Due'], a.missing.map((i) => [i.course, i.title, i.due]))}
<h3>Lowest scores (under 85%)</h3>${table(['Course', 'Item', 'Score', '%', 'Due'], a.lowest.map((i) => [i.course, i.title, `${i.earned}/${i.max}`, i.pct, i.due]))}
<h3>Math by textbook lesson</h3>${table(['Lesson', 'Score', 'From'], a.lessons.map((l) => [l.lesson, `${l.pct}%`, l.items.join('; ')]))}
<h3>Waiting for a grade</h3>${table(['Course', 'Item', 'Due'], a.waiting.map((i) => [i.course, i.title, i.due]))}
<h3>Teacher comments</h3>${table(['Due', 'Course', 'Item', 'Comment'], a.comments.map((i) => [i.due, i.course, i.title, i.comment]))}
${a.classes ? `<h3>Classes and syllabuses</h3>${a.classes.map((c) => `<h4>${esc(c.course)}</h4>
<p>${c.syllabus.length ? c.syllabus.map((s) => (s.pdf ? `<a href="${esc(s.pdf.replace(/^[^/]+\//, ''))}">${esc(s.title)} (PDF)</a>` : s.link ? `<a href="${esc(s.link)}">${esc(s.title)}</a> (needs the school Google account)` : esc(s.title))).join(' · ') : '<span class="none">No syllabus posted.</span>'}</p>
${c.units.length ? `<p><b>Units:</b> ${c.units.map(esc).join(' · ')}</p>` : ''}
<p class="none">${Object.entries(c.counts).map(([k, v]) => `${v} ${esc(k)}`).join(', ') || 'No materials posted.'}</p>`).join('')}` : ''}
</section>`).join('\n');
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>School report</title>
<style>body{font:15px/1.45 system-ui,sans-serif;max-width:1000px;margin:24px auto;padding:0 16px;color:#1b2430}h2{margin-top:36px}small{color:#667;font-weight:400;font-size:.8em}
table{border-collapse:collapse;width:100%;margin:6px 0 14px;font-size:14px}td,th{border-bottom:1px solid #dde;padding:4px 8px;text-align:left;vertical-align:top}th{background:#f2f4f8}.none{color:#667}</style>
<h1>School report</h1><p>Local only: built from Schoology on this Mac. Not uploaded anywhere.</p>${body}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(DIR, { recursive: true });
  const dl = join(homedir(), 'Downloads');
  // grades: schoology-<student>-<date>.json; class materials: schoology-materials-<student>-<date>.json
  for (const f of readdirSync(dl).filter((f) => /^schoology-[a-z-]+-\d{4}-\d{2}-\d{2}\.json$/.test(f))) {
    const d = JSON.parse(readFileSync(join(dl, f), 'utf8'));
    const materials = f.startsWith('schoology-materials-');
    if (!d.student || !Array.isArray(materials ? d.courses : d.items)) { console.log(`skipped ${f}: not a Schoology export`); continue; }
    const slug = f.replace(/^schoology-(materials-)?|-\d{4}-\d{2}-\d{2}\.json$/g, ''), date = f.match(/\d{4}-\d{2}-\d{2}/)[0];
    const to = `${materials ? 'materials-' : ''}${date}.json`;
    mkdirSync(join(DIR, slug), { recursive: true });
    renameSync(join(dl, f), join(DIR, slug, to));
    console.log(`moved ${f} -> data/schoology/${slug}/${to}`);
  }
  const all = readdirSync(DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => {
    const files = readdirSync(join(DIR, e.name));
    const latest = files.filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1);
    const mat = files.filter((f) => /^materials-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().at(-1);
    if (!latest) return null;
    const a = analyze(JSON.parse(readFileSync(join(DIR, e.name, latest), 'utf8')));
    const syl = join(DIR, e.name, 'syllabus'); // saved syllabus PDFs (<COURSE>.pdf) and links.json { course: url } for Google Docs ones
    if (mat) a.classes = classes(JSON.parse(readFileSync(join(DIR, e.name, mat), 'utf8')), existsSync(syl) ? readdirSync(syl).filter((f) => f.endsWith('.pdf')).map((f) => `${e.name}/syllabus/${f}`) : [],
      existsSync(join(syl, 'links.json')) ? JSON.parse(readFileSync(join(syl, 'links.json'), 'utf8')) : {});
    return a;
  }).filter(Boolean);
  writeFileSync(join(DIR, 'report.html'), report(all));
  writeFileSync(join(DIR, 'analysis.json'), JSON.stringify(all, null, 1));
  for (const a of all) console.log(`${a.student}: ${a.courses.length} courses, ${a.missing.length} missing, ${a.lowest.length} under 85%, ${a.comments.length} comments, math lessons ${a.lessons.map((l) => `${l.lesson} ${l.pct}%`).join(', ') || 'none'}`);
  console.log(`report: ${join(DIR, 'report.html')}`);
}
