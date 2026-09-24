// Shared helpers for loading and checking word sets.
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

export const ROOT = new URL('..', import.meta.url).pathname;
export const SETS_DIR = join(ROOT, 'sets');

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Check one set. Returns a list of problems (empty when the set is fine). */
export function validateSet(set, slug) {
  const errs = [];
  if (!SLUG_RE.test(slug)) errs.push(`file name "${slug}" should use only lowercase letters, numbers and dashes`);
  if (!set || typeof set !== 'object') return [...errs, 'file is not a JSON object'];
  if (typeof set.title !== 'string' || !set.title.trim()) errs.push('"title" is missing');
  if (set.subtitle != null && typeof set.subtitle !== 'string') errs.push('"subtitle" must be text');
  if (set.date != null && !/^\d{4}-\d{2}-\d{2}$/.test(set.date)) errs.push('"date" must look like 2026-09-25');
  if (!Array.isArray(set.words)) return [...errs, '"words" must be a list'];
  if (set.words.length < 4) errs.push(`needs at least 4 words (has ${set.words.length}); the quiz shows 4 choices`);

  const seen = new Set();
  set.words.forEach((w, i) => {
    const where = `word #${i + 1}`;
    if (!w || typeof w.word !== 'string' || !w.word.trim()) { errs.push(`${where}: "word" is missing`); return; }
    if (typeof w.definition !== 'string' || !w.definition.trim()) errs.push(`${where} (${w.word}): "definition" is missing`);
    const key = w.word.trim().toLowerCase();
    if (seen.has(key)) errs.push(`${where}: "${w.word}" appears twice`);
    seen.add(key);
  });
  return errs;
}

/** Load every sets/*.json file. Throws with a readable message if any set is broken. */
export function loadSets() {
  const files = readdirSync(SETS_DIR).filter(f => f.endsWith('.json')).sort();
  const sets = [];
  const problems = [];
  for (const f of files) {
    const slug = basename(f, '.json');
    let data;
    try {
      data = JSON.parse(readFileSync(join(SETS_DIR, f), 'utf8'));
    } catch (e) {
      problems.push(`sets/${f}: not valid JSON (${e.message})`);
      continue;
    }
    const errs = validateSet(data, slug);
    if (errs.length) { problems.push(...errs.map(m => `sets/${f}: ${m}`)); continue; }
    sets.push({
      slug,
      title: data.title.trim(),
      subtitle: (data.subtitle || '').trim(),
      date: data.date || null,
      words: data.words.map(w => ({ word: w.word.trim(), definition: w.definition.trim() })),
    });
  }
  if (problems.length) {
    const err = new Error('Some word sets need fixing:\n  - ' + problems.join('\n  - '));
    err.problems = problems;
    throw err;
  }
  // Newest first by date; undated sets go last, alphabetically.
  sets.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.slug.localeCompare(b.slug));
  return sets;
}

/**
 * Parse pasted word lists. One word per line, separated from its meaning by
 * a tab, "|", " - ", " – ", " — ", ":" or "=". Blank lines and lines starting with # are skipped.
 */
export function parseWordLines(text) {
  const words = [];
  const skipped = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^\d+[.)]\s*/, ''); // drop "1." / "1)" numbering
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(.+?)\s*(?:\t|\||\s[-–—]\s|:|=)\s*(.+)$/);
    if (!m) { skipped.push(raw); continue; }
    words.push({ word: m[1].trim(), definition: m[2].trim() });
  }
  return { words, skipped };
}
