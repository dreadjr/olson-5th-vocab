// Writing practice: fix-the-sentence items, sentences with this week's vocab words, and free writing.
// Grammar is checked on this device by Harper (harper.js, Apache-2.0, WebAssembly, loaded from jsDelivr on first use);
// with the local tutor running, "Why?" asks Claude to explain one flagged problem in kid language (/api/grammar).
const HARPER = 'https://cdn.jsdelivr.net/npm/harper.js@3.0.0/dist/';
const main = document.getElementById('main');
const status = document.getElementById('status');
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

// ---- Harper, loaded once (≈7.5 MB the first time, then cached by the browser)
let harper = null;
function linter() {
  harper ||= (async () => {
    status.textContent = 'Loading the grammar checker (the first time takes a moment)…';
    const [{ LocalLinter, Dialect }, { binary }] = await Promise.all([import(`${HARPER}index.js`), import(`${HARPER}binary.js`)]);
    const l = new LocalLinter({ binary, dialect: Dialect.American });
    await l.setup();
    status.textContent = tutor ? 'Grammar checker ready. Tap “Why?” on any problem for an explanation.' : 'Grammar checker ready.';
    return l;
  })().catch(() => { status.textContent = 'The grammar checker couldn’t load (offline?). Answers are still checked.'; return null; });
  return harper;
}
// Harper's lint kinds in words a 5th grader knows.
const KINDS = { Agreement: 'Agreement', BoundaryError: 'Word spacing', Capitalization: 'Capital letter', Eggcorn: 'Wrong word', Enhancement: 'Better word',
  Formatting: 'Spacing', Grammar: 'Grammar', Malapropism: 'Wrong word', Miscellaneous: 'Check this', Nonstandard: 'Not standard English', Punctuation: 'Punctuation',
  Readability: 'Hard to read', Redundancy: 'Extra words', Regionalism: 'Word choice', Repetition: 'Repeated word', Spelling: 'Spelling', Style: 'Style',
  Typo: 'Typo', Usage: 'Word use', WordChoice: 'Word choice', WordOrder: 'Word order' };
/** Problems in a piece of writing: [{start, end, problem, message, kind, fixes: [text]}] (empty if Harper isn't available). */
async function lint(text) {
  const l = await linter();
  if (!l || !text.trim()) return [];
  const lints = await l.lint(text);
  return lints.map((x) => {
    const span = x.span();
    const out = { start: span.start, end: span.end, problem: x.get_problem_text(), message: x.message().replace(/`([^`]+)`/g, '“$1”'), kind: KINDS[x.lint_kind()] || x.lint_kind_pretty(),
      fixes: x.suggestions().map((s) => ({ text: s.get_replacement_text(), remove: s.kind() === 1 })) };
    x.free(); // results live in WebAssembly memory until freed
    return out;
  });
}

// ---- the tutor at home (Claude): only for "Why?" explanations
let tutor = false;
fetch('/api/health', { signal: AbortSignal.timeout(1000) }).then((r) => r.ok && r.json()).then((j) => { tutor = j?.ok === true; }).catch(() => {});
async function why(text, issue, out, btn) {
  btn.disabled = true;
  out.textContent = '…';
  try {
    const r = await fetch('/api/grammar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, problem: issue.problem, message: issue.message, kind: issue.kind }) });
    if (!r.ok) throw new Error();
    rich(out, (await r.text()).replace(/```[a-z]*\n?/g, ''));
  } catch { out.textContent = 'The tutor isn’t available right now.'; } finally { btn.disabled = false; }
}

// The tutor's **bold** and *italic* shown as real bold/italic (built as nodes, never as HTML).
function rich(out, text) {
  out.replaceChildren(...text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/).map((p) => (
    /^\*\*.+\*\*$/.test(p) ? el('b', '', p.slice(2, -2)) : /^\*.+\*$/.test(p) ? el('i', '', p.slice(1, -1)) : document.createTextNode(p))));
}

/** The list of problems under a box, with one-tap fixes and "Why?". onFix(newText) replaces the writing. */
function renderIssues(list, text, issues, onFix) {
  list.replaceChildren(...issues.map((i) => {
    const li = el('li', 'issue');
    const head = el('div');
    head.append(el('span', 'kind', i.kind), ' ', el('q', '', i.problem), ' ', i.message);
    li.append(head);
    const fixes = el('div', 'fixes');
    for (const f of i.fixes.slice(0, 3)) {
      const b = el('button', 'ghost', f.remove ? 'Remove it' : `Change to “${f.text}”`);
      b.type = 'button';
      b.addEventListener('click', () => onFix(text.slice(0, i.start) + (f.remove ? '' : f.text) + text.slice(i.end)));
      fixes.append(b);
    }
    const out = el('div', 'why');
    if (tutor) {
      const b = el('button', '', 'Why?');
      b.type = 'button';
      b.addEventListener('click', () => why(text, i, out, b));
      fixes.append(b);
    }
    li.append(fixes, out);
    return li;
  }));
}

function readAloud(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  speechSynthesis.speak(u);
}
const norm = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

// ---- 1. Fix the sentence
async function fixMode() {
  const { items } = await (await fetch('items.json')).json();
  const prog = load('writing-progress', {});
  const save = () => store('writing-progress', prog);
  const head = el('p', 'status');
  const count = () => { head.textContent = `${items.filter((it) => prog[it.id]?.right).length} of ${items.length} fixed`; };
  count();
  main.replaceChildren(head, ...items.map((it) => {
    const card = el('section', 'card');
    const mark = el('span', 'mark');
    const meta = el('div', 'meta');
    meta.append(mark, el('span', 'chip', it.skill), el('span', 'chip std', it.std));
    const box = el('textarea');
    box.rows = 2;
    box.value = prog[it.id]?.answer ?? it.wrong;
    box.setAttribute('aria-label', `Your fixed sentence: ${it.prompt}`);
    box.spellcheck = false;
    const result = el('div', 'result');
    result.setAttribute('aria-live', 'polite');
    const issues = el('ul', 'issues');
    const setMark = () => { const p = prog[it.id]; mark.textContent = p?.right ? '✓' : p?.tries ? '✗' : ''; mark.className = `mark ${p?.right ? 'right' : 'wrong'}`; };
    setMark();
    const check = el('button', '', 'Check');
    const hint = el('button', 'ghost', 'Hint');
    const read = el('button', 'ghost', 'Read aloud');
    const show = el('button', 'ghost', 'Show an answer');
    show.hidden = !(prog[it.id]?.tries >= 2) || prog[it.id]?.right;
    for (const b of [check, hint, read, show]) b.type = 'button';
    hint.addEventListener('click', () => { result.replaceChildren(el('b', '', 'Hint: '), it.hint); });
    read.addEventListener('click', () => readAloud(box.value));
    show.addEventListener('click', () => { result.replaceChildren(el('b', '', 'One answer: '), it.accept[0], el('br'), it.why); });
    box.addEventListener('input', () => { (prog[it.id] ||= {}).answer = box.value; save(); });
    check.addEventListener('click', async () => {
      const p = (prog[it.id] ||= {});
      p.answer = box.value;
      p.tries = (p.tries || 0) + 1;
      const right = it.accept.some((a) => norm(a) === norm(box.value));
      if (right) p.right = true;
      save(); setMark(); count();
      if (right) { result.replaceChildren(el('b', 'ok', '✓ Right! '), it.why); issues.replaceChildren(); show.hidden = true; return; }
      const loose = (x) => norm(x).toLowerCase().replace(/[^a-z0-9' ]/g, '');
      const nearly = it.accept.some((a) => loose(a) === loose(box.value));
      result.replaceChildren(el('b', 'no', nearly ? 'So close! ' : 'Not yet. '),
        nearly ? 'The words are right. Check the capital letters and punctuation (commas, periods, apostrophes).'
          : norm(box.value) === norm(it.wrong) ? 'The sentence hasn’t changed yet.' : 'Check the hint, or look at what the checker found below.');
      show.hidden = p.tries < 2;
      const found = await lint(box.value);
      renderIssues(issues, box.value, found, (t) => { box.value = t; box.dispatchEvent(new Event('input')); });
    });
    const row = el('div', 'row');
    row.append(check, hint, read, show);
    card.append(meta, el('p', 'prompt', it.prompt), Object.assign(el('p', 'wrong', it.wrong)), box, row, result, issues);
    return card;
  }));
}

// ---- 2. Use your words: a sentence for each word in a vocab set
async function wordsMode() {
  const sets = await (await fetch('words.json')).json();
  const want = new URLSearchParams(location.search).get('set');
  let set = sets.find((s) => s.slug === want) || sets.at(-1);
  const pick = el('select');
  pick.setAttribute('aria-label', 'Word list');
  for (const s of sets) pick.append(Object.assign(el('option', '', s.title), { value: s.slug, selected: s === set }));
  const list = el('div');
  const draw = () => {
    const saved = load(`writing-words:${set.slug}`, {});
    list.replaceChildren(...set.words.map((w) => {
      const card = el('section', 'card');
      const p = el('p', 'prompt');
      p.append('Write a sentence using ', el('mark', '', w.word), '.');
      const box = el('textarea');
      box.rows = 2;
      box.value = saved[w.word] || '';
      box.setAttribute('aria-label', `A sentence using ${w.word}`);
      const result = el('div', 'result');
      result.setAttribute('aria-live', 'polite');
      const issues = el('ul', 'issues');
      const check = el('button', '', 'Check');
      check.type = 'button';
      check.addEventListener('click', async () => {
        const t = box.value.trim();
        saved[w.word] = box.value; store(`writing-words:${set.slug}`, saved);
        const stem = w.word.toLowerCase().replace(/e$/, '');
        const uses = new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*`, 'i').test(t);
        const problems = [];
        if (!uses) problems.push(`Use the word “${w.word}” (or a form of it, like ${w.word}s or ${stem}ed).`);
        if (t.split(/\s+/).length < 5) problems.push('Write a full sentence, at least 5 words.');
        if (t && !/^[A-Z"“]/.test(t)) problems.push('Start with a capital letter.');
        if (t && !/[.!?]["”]?$/.test(t)) problems.push('End with a period, question mark or exclamation point.');
        const found = await lint(t);
        if (!problems.length && !found.length) result.replaceChildren(el('b', 'ok', '✓ Great sentence!'));
        else result.replaceChildren(el('b', 'no', 'Almost. '), problems.join(' '));
        renderIssues(issues, box.value, found, (x) => { box.value = x; });
      });
      const row = el('div', 'row');
      row.append(check);
      card.append(p, el('p', 'def', w.definition), box, row, result, issues);
      return card;
    }));
  };
  pick.addEventListener('change', () => { set = sets.find((s) => s.slug === pick.value); history.replaceState(null, '', `?mode=words&set=${set.slug}`); draw(); });
  const top = el('div', 'row');
  top.append(pick);
  main.replaceChildren(top, list);
  draw();
}

// ---- 3. Free write: checked as you type
function freeMode() {
  const card = el('section', 'card');
  const box = el('textarea');
  box.rows = 8;
  box.placeholder = 'Write anything: a story, a paragraph for school, sentences with your words…';
  box.value = load('writing-free', '');
  box.setAttribute('aria-label', 'Your writing');
  const note = el('div', 'result');
  note.setAttribute('aria-live', 'polite');
  const issues = el('ul', 'issues');
  const row = el('div', 'row');
  const read = el('button', 'ghost', 'Read it to me');
  read.type = 'button';
  read.addEventListener('click', () => readAloud(box.value));
  row.append(read);
  // The checker misses some grammar (pronouns, verb forms); the tutor can look for those too.
  const more = el('button', 'ghost', 'Ask the tutor to look too');
  more.type = 'button';
  const moreOut = el('div', 'issue why');
  moreOut.hidden = true;
  more.hidden = true;
  setTimeout(() => { more.hidden = !tutor; }, 1200);
  more.addEventListener('click', () => {
    if (!box.value.trim()) return;
    moreOut.hidden = false;
    why(box.value, { problem: '', kind: 'Review', message: 'Look for up to 3 grammar mistakes a simple checker might miss (pronouns like me/I, verb forms like seen/saw, subject-verb agreement). For each, name the rule kindly. Do not rewrite the writing.' }, moreOut, more);
  });
  row.append(more);
  let timer = 0;
  const run = async () => {
    store('writing-free', box.value);
    const found = await lint(box.value);
    note.replaceChildren(box.value.trim() ? (found.length ? el('b', 'no', `${found.length} thing${found.length > 1 ? 's' : ''} to look at:`) : el('span', 'clean', '✓ No problems found.')) : '');
    renderIssues(issues, box.value, found, (t) => { box.value = t; run(); });
  };
  box.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 500); });
  card.append(box, row, note, issues, moreOut);
  main.replaceChildren(card);
  if (box.value.trim()) run();
}

// ---- mode switch, remembered
const modes = { fix: fixMode, words: wordsMode, free: freeMode };
const buttons = [...document.querySelectorAll('.modes button')];
function setMode(m) {
  if (!modes[m]) m = 'fix';
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  store('writing-mode', m);
  const q = new URLSearchParams(location.search);
  if (q.get('mode') !== m) { q.set('mode', m); if (m !== 'words') q.delete('set'); history.replaceState(null, '', `?${q}`); }
  modes[m]();
}
buttons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
setMode(new URLSearchParams(location.search).get('mode') || (new URLSearchParams(location.search).get('set') ? 'words' : load('writing-mode', 'fix')));
linter(); // start loading Harper in the background
