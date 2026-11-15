// Help panel for review forms: three hints in order (nudge, similar example, this problem) plus lesson links.
// Reads ./help.json and ../lessons.json; does nothing on pages without them. When the local tutor
// (bun run tutor) is serving the page, an Ask box sends questions to /api/ask, and each question's
// answer box gets a Check button (/api/check). Answers, checks and a progress summary are kept in this browser.
(async () => {
  const page = location.pathname.split('/').filter(Boolean).at(-1) || '';
  let help, lessons;
  try {
    [help, lessons] = await Promise.all(['./help.json', '../lessons.json'].map((u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject()))));
  } catch { return; }

  let local = false;
  try {
    const r = await fetch('/api/health', { signal: AbortSignal.timeout(1000) });
    local = r.ok && (await r.json()).ok === true;
  } catch { /* public site or file:// */ }

  const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
  const STEP_NAMES = ['Hint', 'Similar example', 'This problem'];
  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

  // Progress in this browser: { [id]: { answer, status: 'answered'|'right'|'wrong', tries: [{ answer, correct, t }] } }
  const KEY = `progress:${page}`;
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* storage blocked or bad data */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* storage blocked */ } };
  const rec = (id) => (progress[id] ||= { answer: '', status: '', tries: [] });
  const marks = {}, labels = {};
  const MARK = { right: '✓', wrong: '✗', answered: '•' };
  const MARK_TEXT = { right: 'right', wrong: 'not yet right', answered: 'answered, not checked' };

  // Question ids: same rule as scripts/help-check.mjs questionIds().
  const questions = [], qEls = {}, qLesson = {};
  document.querySelectorAll('section.part').forEach((part, i) => {
    part.querySelectorAll('.q, .task').forEach((q) => {
      const n = q.querySelector(':scope > .n');
      const id = q.classList.contains('task') ? ROMAN[i] : n && `${ROMAN[i]}-${parseInt(n.textContent, 10)}`;
      const entry = id && help.entries?.[id];
      if (!entry) return;
      questions.push(id);
      qEls[id] = q; qLesson[id] = entry.lesson;
      q.id = `q-${id}`;
      labels[id] = id.includes('-') ? `Part ${id.replace('-', ' #')}` : `Part ${id}`;
      marks[id] = el('span', 'mark');
      (n || q).prepend(marks[id]);
      const host = q.classList.contains('task') ? q : q.lastElementChild;
      const meta = el('div', 'q-meta');
      meta.append(lessonChip(entry.lesson));
      host.prepend(meta);
      const box = answerBox(id, host, q.classList.contains('task'));
      host.append(box);
      pickers(host, box.querySelector('input, textarea'));
      attach(host, id, entry);
    });
  });

  // Small "Lesson 4.5" chip on each question, linking to that lesson's student text.
  function lessonChip(n) {
    const info = lessons[n] || {};
    const text = info.links?.find((l) => l.label === 'Student text');
    const chip = el(text ? 'a' : 'span', 'lesson-chip', `Lesson ${n}`);
    if (text) { chip.href = text.url; chip.target = '_blank'; chip.rel = 'noopener'; }
    chip.title = info.title ? `Lesson ${n}: ${info.title}${info.page ? `, p. ${info.page}` : ''}` : '';
    return chip;
  }

  // Views: Worksheet (the printable page), Cards, Focus (one question at a time). Remembered per device.
  const VIEWS = ['worksheet', 'cards', 'focus'];
  let view = 'worksheet';
  try { const v = localStorage.getItem('view'); if (VIEWS.includes(v)) view = v; } catch { /* storage blocked */ }
  const viewBtns = {};
  const switcher = el('div', 'views');
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', 'View');
  for (const v of VIEWS) {
    const b = viewBtns[v] = el('button', '', v[0].toUpperCase() + v.slice(1));
    b.type = 'button';
    b.addEventListener('click', () => setView(v));
    switcher.append(b);
  }
  let cur = null;
  try { cur = localStorage.getItem(`focus:${page}`); } catch { /* storage blocked */ }
  const strip = el('div', 'focus-strip');
  strip.setAttribute('aria-hidden', 'true'); // Prev/Next are the accessible way through
  const fbar = el('div', 'focus-bar');
  const prevB = el('button', '', '← Prev'), nextB = el('button', '', 'Next →'), checkB = el('button', 'focus-check', 'Check'), pos = el('span', 'focus-pos');
  for (const b of [prevB, nextB, checkB]) b.type = 'button';
  pos.setAttribute('aria-live', 'polite');
  fbar.append(prevB, pos, checkB, nextB);
  const shownQs = () => questions.filter((id) => !qEls[id].hidden);
  prevB.addEventListener('click', () => step(-1));
  nextB.addEventListener('click', () => step(1));
  checkB.addEventListener('click', () => qEls[cur]?.querySelector('.answer')?.requestSubmit());
  document.addEventListener('keydown', (e) => {
    if (view !== 'focus' || e.altKey || e.metaKey || e.ctrlKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });

  function step(d) {
    const qs = shownQs(), i = qs.indexOf(cur) + d;
    if (i >= 0 && i < qs.length) go(qs[i]);
  }

  function go(id) {
    cur = id;
    try { localStorage.setItem(`focus:${page}`, id); } catch { /* storage blocked */ }
    updateFocus();
    if (view === 'focus') window.scrollTo(0, 0);
  }

  function updateFocus() {
    const qs = shownQs();
    if (!qs.includes(cur)) cur = qs[0] || null;
    document.querySelectorAll('.focus-path, .focus-cur').forEach((e) => e.classList.remove('focus-path', 'focus-cur'));
    if (cur) {
      qEls[cur].classList.add('focus-cur', 'focus-path');
      for (let p = qEls[cur].parentElement; p && p.tagName !== 'MAIN'; p = p.parentElement) p.classList.add('focus-path');
    }
    const i = qs.indexOf(cur);
    pos.textContent = cur ? `${labels[cur]} · ${i + 1} of ${qs.length}` : 'No questions showing';
    prevB.disabled = i <= 0;
    nextB.disabled = i < 0 || i >= qs.length - 1;
    checkB.hidden = !qEls[cur]?.querySelector('.answer button');
    strip.replaceChildren(...qs.map((id) => {
      const seg = el('span', `seg ${progress[id]?.status || ''}${id === cur ? ' cur' : ''}`);
      seg.addEventListener('click', () => go(id));
      return seg;
    }));
  }

  function setView(v) {
    view = v;
    document.body.dataset.view = v;
    for (const k of VIEWS) viewBtns[k].setAttribute('aria-pressed', String(k === v));
    try { localStorage.setItem('view', v); } catch { /* storage blocked */ }
    updateFocus();
  }

  // Summary and history at the top of the page.
  const panel = el('details', 'progress');
  const summary = el('summary');
  const list = el('ul', 'progress-list');
  let hiddenLessons = new Set();
  const lessonBoxes = {};
  panel.append(summary, lessonFilter());
  if (!local) panel.append(el('p', 'progress-note', 'Check and Ask work when the tutor is on: open your tutor link once on this device.'));
  panel.append(el('div', 'progress-head', 'Checked answers'), list);
  document.querySelector('section.part')?.before(panel);
  panel.after(strip);
  document.body.append(fbar);
  const toggle = document.getElementById('toggle');
  toggle ? toggle.before(switcher) : document.querySelector('.toolbar')?.append(switcher);
  render();
  setView(view);

  // "4.1–4.3, 4.6" from the lessons that are showing.
  function lessonRange(ns) {
    const out = [];
    for (const n of ns) {
      const last = out.at(-1), [b, l] = n.split('.').map(Number);
      if (last && last.b === b && last.to + 1 === l) last.to = l; else out.push({ b, from: l, to: l });
    }
    return out.map((r) => r.from === r.to ? `${r.b}.${r.from}` : `${r.b}.${r.from}–${r.b}.${r.to}`).join(', ');
  }

  function showLesson(n) {
    hiddenLessons.delete(n);
    if (lessonBoxes[n]) lessonBoxes[n].checked = true;
    try { localStorage.setItem('hide-lessons', JSON.stringify([...hiddenLessons])); } catch { /* storage blocked */ }
    applyLessons();
  }

  function applyLessons() {
    for (const id of questions) qEls[id].hidden = hiddenLessons.has(qLesson[id]);
    document.querySelectorAll('section.part').forEach((part) => {
      const qs = [...part.querySelectorAll('.q, .task')];
      part.hidden = qs.length > 0 && qs.every((q) => q.hidden);
    });
    render();
  }

  // Lessons the class hasn't covered yet: hidden on every form, remembered in this browser.
  // shortcut: a question is filed under its first lesson only (help.json "lesson"); fine while tags name one lesson.
  function lessonFilter() {
    try { hiddenLessons = new Set(JSON.parse(localStorage.getItem('hide-lessons')) || []); } catch { /* storage blocked */ }
    const box = el('fieldset', 'lessons');
    box.append(el('legend', '', 'Lessons covered'));
    for (const n of allLessons()) {
      const label = el('label');
      const cb = lessonBoxes[n] = el('input');
      cb.type = 'checkbox';
      cb.checked = !hiddenLessons.has(n);
      cb.addEventListener('change', () => {
        if (cb.checked) return showLesson(n);
        hiddenLessons.add(n);
        try { localStorage.setItem('hide-lessons', JSON.stringify([...hiddenLessons])); } catch { /* storage blocked */ }
        applyLessons();
      });
      label.title = lessons[n]?.title || '';
      label.append(cb, ` ${n}`);
      box.append(label);
    }
    queueMicrotask(applyLessons); // after the panel exists
    return box;
  }

  function allLessons() {
    return [...new Set(questions.map((id) => qLesson[id]))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  function render() {
    const shown = questions.filter((id) => !qEls[id].hidden);
    const by = (st) => shown.filter((id) => progress[id]?.status === st).length;
    const done = shown.filter((id) => progress[id]?.status).length;
    const covered = allLessons().filter((n) => !hiddenLessons.has(n));
    const scope = covered.length === allLessons().length ? 'All lessons' : covered.length ? `Lessons ${lessonRange(covered)}` : 'No lessons';
    summary.textContent = `${scope} · ${done} of ${shown.length} answered · ${by('right')} right · ${by('wrong')} to fix · ${by('answered')} not checked`;
    for (const id of questions) {
      const st = progress[id]?.status || '';
      marks[id].textContent = MARK[st] || '';
      marks[id].dataset.status = st;
      marks[id].title = MARK_TEXT[st] || '';
      if (st) { marks[id].setAttribute('role', 'img'); marks[id].setAttribute('aria-label', MARK_TEXT[st]); }
      else marks[id].removeAttribute('aria-label');
    }
    const tries = Object.entries(progress).flatMap(([id, r]) => (r.tries || []).map((t) => ({ id, ...t }))).sort((a, b) => b.t - a.t);
    list.replaceChildren(...(tries.length ? tries.map((t) => {
      const off = qEls[t.id]?.hidden, n = qLesson[t.id];
      const li = el('li', `${t.correct ? 'right' : 'wrong'}${off ? ' off' : ''}`);
      const a = el('a', '', labels[t.id] || t.id);
      a.href = `#q-${t.id}`;
      if (off) a.addEventListener('click', () => showLesson(n)); // show it again, then the link jumps to it
      a.addEventListener('click', () => { if (view === 'focus') go(t.id); });
      li.append(a, ` · “${t.answer}” · `, el('b', '', t.correct ? 'Right' : 'Not yet'), ` · ${new Date(t.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`);
      if (off) li.append(el('span', 'off-note', ` (Lesson ${n} hidden)`));
      return li;
    }) : [el('li', 'empty', 'No answers checked yet.')]));
    updateFocus();
  }

  function attach(host, id, entry) {
    const btn = el('button', 'helpbtn', 'Help');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    host.append(btn);
    let panel = null, step = 0;

    btn.addEventListener('click', () => {
      if (panel) { panel.hidden = !panel.hidden; btn.setAttribute('aria-expanded', String(!panel.hidden)); return; }
      btn.setAttribute('aria-expanded', 'true');
      panel = el('div', 'help');
      const lesson = lessons[entry.lesson] || {};
      const src = el('div', 'help-src');
      src.append(el('span', 'src', entry.tag), lesson.title ? ` ${lesson.title}` : '');
      const links = el('div', 'help-links');
      for (const l of lesson.links || []) {
        const a = el('a', '', l.label);
        a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
        links.append(a);
      }
      const steps = el('ol', 'help-steps');
      const next = el('button', 'help-next', 'Next hint');
      next.type = 'button';
      const reveal = () => {
        const li = el('li');
        li.append(el('b', '', `${STEP_NAMES[step]}: `));
        const body = el('span');
        body.innerHTML = entry.hints[step].replace(/^Example:\s*/, ''); // our own checked content from help.json
        li.append(body);
        steps.append(li);
        step++;
        if (local) post('/api/log', { page, id, step }).catch(() => {});
        if (step === 3) next.remove();
        else next.textContent = step === 1 ? 'Show a similar example' : 'Show this problem';
      };
      next.addEventListener('click', reveal);
      panel.append(src, links, steps, next);
      if (local) panel.append(askBox(id, () => step, host));
      host.append(panel);
      reveal();
    });
  }

  // Tap-to-pick: multiple-choice letters and YES/NO options fill the answer box.
  function pickers(host, input) {
    const lis = choices(host);
    const multi = /all that apply/i.test(questionText(host));
    const rows = [];
    host.querySelectorAll('.tf').forEach((tf) => {
      const k = [...tf.children];
      for (let i = 0; i + 2 < k.length; i += 3) {
        const tag = k[i].textContent.trim().match(/^(\d+[a-z])/i)?.[1]?.toLowerCase();
        if (tag) rows.push({ tag, opts: [k[i + 1], k[i + 2]] });
      }
    });
    const inRows = new Set(rows.flatMap((r) => r.opts));
    const lone = [...host.querySelectorAll('.opt')].filter((o) => !inRows.has(o));
    const word = (o) => o.textContent.trim().toUpperCase();
    const letters = () => new Set(input.value.toUpperCase().match(/\b[A-H]\b/g) || []);
    const rowPicks = () => Object.fromEntries([...input.value.matchAll(/(\d+[a-z])\s*(YES|NO)/gi)].map((m) => [m[1].toLowerCase(), m[2].toUpperCase()]));
    const set = (v) => { input.value = v; input.dispatchEvent(new Event('input')); };
    const sync = () => {
      const L = letters(), R = rowPicks(), lead = input.value.trim().match(/^(YES|NO)\b/i)?.[1]?.toUpperCase();
      for (const [li, l] of lis) li.setAttribute('aria-pressed', String(L.has(l)));
      for (const r of rows) for (const o of r.opts) o.setAttribute('aria-pressed', String(R[r.tag] === word(o)));
      for (const o of lone) o.setAttribute('aria-pressed', String(lead === word(o)));
    };
    const tappable = (node, fn) => {
      node.classList.add('pick');
      node.tabIndex = 0;
      node.setAttribute('role', 'button');
      node.addEventListener('click', fn);
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
    };
    for (const [li] of lis) li.classList.add('choice');
    for (const [li, l] of lis) tappable(li, () => {
      const L = multi ? letters() : new Set();
      multi && L.has(l) ? L.delete(l) : L.add(l);
      set([...L].sort().join(', '));
    });
    for (const r of rows) for (const o of r.opts) tappable(o, () => {
      const R = rowPicks();
      R[r.tag] = word(o);
      set(rows.filter((x) => R[x.tag]).map((x) => `${x.tag} ${R[x.tag]}`).join(', '));
    });
    for (const o of lone) tappable(o, () => set(`${word(o)} ${input.value.replace(/^\s*(YES|NO)\b[\s.,]*/i, '')}`.trim()));
    input.addEventListener('input', sync);
    sync();
  }

  // Answer choices: sibling elements whose text starts "A. ", "B. " … (a .ch list or a grid of spans), with their letters.
  function choices(host) {
    const skip = '.ans, .help, .answer, .q-meta, .helpbtn';
    const letter = (e) => !e.closest(skip) && e.textContent.trim().match(/^([A-H])\.(\s|$)/)?.[1];
    const out = [];
    for (const e of host.querySelectorAll('li, span, div, p')) {
      const l = letter(e);
      if (l && e.parentElement && [...e.parentElement.children].filter(letter).length >= 2) out.push([e, l]);
    }
    return out;
  }

  // Multiple-choice and YES/NO keys are already on the page (Show answers), so those check without the tutor.
  function autoKey(host) {
    const text = [...host.querySelectorAll('.ans')].map((a) => { const c = a.cloneNode(true); c.querySelector('.src')?.remove(); return c.textContent; }).join(' ').trim();
    if (choices(host).length) {
      const m = text.match(/^([A-H](?:\s*(?:,|&|and)\s*[A-H])*)(?![a-z])/);
      return m && { letters: new Set(m[1].match(/[A-H]/g)) };
    }
    if (host.querySelector('.tf')) {
      const pairs = [...text.matchAll(/(\d+[a-z])\s+(YES|NO)/gi)];
      return pairs.length ? { rows: Object.fromEntries(pairs.map((m) => [m[1].toLowerCase(), m[2].toUpperCase()])) } : null;
    }
    return null;
  }

  function autoCheck(key, answer) {
    if (key.letters) {
      const got = new Set(answer.toUpperCase().match(/\b[A-H]\b/g) || []);
      const ok = got.size === key.letters.size && [...got].every((l) => key.letters.has(l));
      return { correct: ok, feedback: ok ? '' : key.letters.size > 1 ? 'Look at each choice again: one of yours is off, or one is missing. Help has a hint.' : 'Try another choice, or open Help for a hint.' };
    }
    const got = Object.fromEntries([...answer.matchAll(/(\d+[a-z])\s*(YES|NO)/gi)].map((m) => [m[1].toLowerCase(), m[2].toUpperCase()]));
    const wrong = Object.keys(key.rows).filter((k) => got[k] !== key.rows[k]);
    return { correct: !wrong.length, feedback: wrong.length ? `Look again at ${wrong.join(', ')}.` : '' };
  }

  // The question's own text, without the key, help or answer box, for the tutor.
  function questionText(host) {
    const copy = host.cloneNode(true);
    copy.querySelectorAll('.ans, .help, .helpbtn, .answer, .q-meta').forEach((x) => x.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  function answerBox(id, host, big) {
    const box = el('form', 'answer');
    const input = el(big ? 'textarea' : 'input');
    if (big) input.rows = 3;
    input.maxLength = 500;
    const key = autoKey(host);
    input.placeholder = key ? 'Tap a choice or type it' : local ? 'Your answer' : 'Your answer (Check needs the tutor)';
    input.setAttribute('aria-label', `Your answer to ${id}`);
    const r0 = progress[id];
    input.value = r0?.answer || '';
    const result = el('div', 'answer-result');
    result.setAttribute('aria-live', 'polite');
    const showResult = (correct, feedback) => {
      box.classList.add(correct ? 'right' : 'wrong');
      result.replaceChildren(el('b', '', correct ? '✓ Right! ' : '✗ Not yet. '), feedback || '');
    };
    if (r0?.status === 'right' || r0?.status === 'wrong') showResult(r0.status === 'right', r0.feedback);
    input.addEventListener('input', () => {
      const r = rec(id);
      r.answer = input.value;
      r.status = input.value.trim() ? 'answered' : '';
      delete r.feedback;
      save(); render();
      box.classList.remove('right', 'wrong');
      result.textContent = '';
    });
    box.append(input);
    if (!local && !key) { box.append(result); box.addEventListener('submit', (e) => e.preventDefault()); return box; }
    const check = el('button', '', 'Check');
    check.type = 'submit';
    box.append(check, result);
    box.addEventListener('submit', async (e) => {
      e.preventDefault();
      const answer = input.value.trim();
      if (!answer || check.disabled) return;
      check.disabled = true;
      box.classList.remove('right', 'wrong');
      result.textContent = 'Checking…';
      try {
        let correct, feedback;
        if (key) ({ correct, feedback } = autoCheck(key, answer));
        else {
          const r = await post('/api/check', { page, id, question: questionText(host), answer });
          if (!r.ok) throw new Error();
          ({ correct, feedback } = await r.json());
        }
        const p = rec(id);
        p.status = correct ? 'right' : 'wrong';
        p.feedback = feedback;
        p.tries.push({ answer, correct, t: Date.now() });
        save(); render();
        showResult(correct, feedback);
      } catch {
        result.textContent = "The checker isn't available right now.";
      } finally { check.disabled = false; }
    });
    return box;
  }

  function askBox(id, getStep, host) {
    const box = el('form', 'help-ask');
    const input = el('textarea');
    input.maxLength = 500; input.rows = 2; input.placeholder = 'Still stuck? Ask a question…';
    input.setAttribute('aria-label', 'Ask the tutor a question');
    const send = el('button', '', 'Ask');
    send.type = 'submit';
    const reply = el('div', 'help-reply');
    reply.setAttribute('aria-live', 'polite');
    box.append(input, send, reply);
    box.addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = input.value.trim();
      if (!message || send.disabled) return;
      send.disabled = true;
      reply.textContent = '…';
      try {
        const r = await post('/api/ask', { page, id, step: getStep(), question: questionText(host), message });
        if (!r.ok) throw new Error(await r.text());
        reply.textContent = '';
        const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
        for (let c; !(c = await reader.read()).done;) reply.textContent += c.value;
        input.value = '';
      } catch (err) {
        reply.textContent = err.message || "The tutor isn't available right now.";
      } finally { send.disabled = false; }
    });
    return box;
  }
})();
