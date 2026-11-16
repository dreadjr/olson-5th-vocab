// Help panel for review forms: three hints in order (nudge, similar example, this problem) plus lesson links.
// Reads ./help.json and ../lessons.json; does nothing on pages without them. When the local tutor
// (bun run tutor) is serving the page, an Ask box sends questions to /api/ask, and each question's
// answer box gets a Check button (/api/check). Answers, checks and a progress summary are kept in this browser.
(async () => {
  const page = location.pathname.split('/').filter(Boolean).at(-1) || '';
  let help, lessons;
  // calc.js and practice.js are added by form.js; wait for them so practice buttons know their skills.
  if (!window.Practice) await new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
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
  // Practice mastery per skill (shared by every form); declared up here because the question loop below uses it.
  let mastery = {};
  try { mastery = JSON.parse(localStorage.getItem('mastery')) || {}; } catch { /* storage blocked */ }
  const practiceButtons = [];
  const LEVELS = [[100, 'Mastered'], [80, 'Proficient'], [50, 'Familiar'], [1, 'Getting started'], [0, 'Not started']];
  const marks = {}, labels = {};
  const MARK = { right: '✓', wrong: '✗', answered: '•' };
  const MARK_TEXT = { right: 'right', wrong: 'not yet right', answered: 'answered, not checked' };

  // Question ids: same rule as scripts/help-check.mjs questionIds().
  const questions = [], qEls = {}, qLesson = {}, works = {};
  const titles = {}; // the start of each question's text, for the calculator's headings
  const study = window.StudyState = { current: null, labels, titles, goto: (id) => (view === 'focus' ? go(id) : qEls[id]?.scrollIntoView({ block: 'center' })) };
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
      meta.append(lessonChip(entry.lesson), readButton(host), keyInfoButton(host), watchButton(() => ({ title: `Watch it: ${entry.skill}`, question: boardQuestion(host), steps: walkSteps(entry) || [] }), !!walkSteps(entry), id), solveButton(host, id, entry), practiceButton(host, entry), pieButton(host, entry));
      titles[id] = questionText(host).replace(/^\d+\.\s*/, '');
      host.prepend(meta);
      answerSteps(host, id, entry);
      // Questions with parts a, b, … get a box under each part; the question's mark combines them.
      const parts = choices(host).length || entry.fields || entry.draw ? [] : partsOf(host, entry);
      let box;
      if (parts.length > 1) parts.forEach((part) => { const b = answerBox(id, host, false, part); (part.li || host).append(b); box ||= b; });
      else { box = entry.draw ? drawBox(id, entry.draw) : entry.fields ? fieldsBox(id, entry.fields, host) : answerBox(id, host, q.classList.contains('task')); host.append(box); }
      works[id] = el('div', 'q-work');
      works[id].hidden = true;
      host.append(works[id]);
      // The question you're on: calculator lines written now are tagged with it (math/calc.js reads StudyState).
      for (const ev of ['focusin', 'pointerdown']) q.addEventListener(ev, () => { study.current = id; });
      pickers(host, box.querySelector('input, textarea'));
      attach(host, id, entry);
    });
  });
  document.dispatchEvent(new Event('study-change')); // the calculator can now name each problem

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
    study.current = id;
    try { localStorage.setItem(`focus:${page}`, id); } catch { /* storage blocked */ }
    updateFocus();
    document.dispatchEvent(new Event('study-change')); // the calculator shows only this question's lines in Focus
    if (view === 'focus') window.scrollTo(0, 0);
  }

  function updateFocus() {
    const qs = shownQs();
    if (!qs.includes(cur)) cur = qs[0] || null;
    document.querySelectorAll('.focus-path, .focus-cur, .focus-ctx').forEach((e) => e.classList.remove('focus-path', 'focus-cur', 'focus-ctx'));
    if (cur) {
      qEls[cur].classList.add('focus-cur', 'focus-path');
      for (let p = qEls[cur].parentElement; p && p.tagName !== 'MAIN'; p = p.parentElement) p.classList.add('focus-path');
      // keep the part heading and the setup this question depends on in view
      qEls[cur].closest('section.part')?.querySelector(':scope > h2')?.classList.add('focus-ctx');
      setupFor(qEls[cur]).forEach((n) => n.classList.add('focus-ctx'));
    }
    refCards(view === 'focus' ? cur : null);
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

  // Focus shows one question, so "Using the data from #1" needs #1 at hand: a small card with #1's question and the
  // student's own answers to it, and a link back. Only in Focus (the worksheet shows #1 anyway).
  function refCards(id) {
    document.querySelectorAll('.ref-card').forEach((c) => c.remove());
    if (!id) return;
    const host = qEls[id].classList.contains('task') ? qEls[id] : qEls[id].lastElementChild;
    const own = [...host.childNodes].filter((n) => n.nodeType === 3 || !n.matches?.('.q-meta, .answer, .help, .helpbtn, .ans, .practice, .pie, .q-work')).map((n) => n.textContent).join(' ');
    const part = id.split('-')[0];
    const refs = [...new Set([...own.matchAll(/#\s?(\d+)/g)].map((m) => `${part}-${m[1]}`))].filter((r) => r !== id && qEls[r]);
    for (const r of refs.reverse()) {
      const card = el('aside', 'ref-card');
      const head = el('div', 'ref-head');
      const go2 = el('button', 'q-tool', `Go to ${labels[r].replace(/^Part [IV]+ /, '')}`);
      go2.type = 'button';
      go2.addEventListener('click', () => go(r));
      head.append(el('b', '', `From ${labels[r].replace(/^Part [IV]+ /, '')}`), go2);
      const rh = qEls[r].classList.contains('task') ? qEls[r] : qEls[r].lastElementChild;
      const qt = [...rh.childNodes].filter((n) => n.nodeType === 3 || !n.matches?.('.q-meta, .answer, .help, .helpbtn, .ans, .practice, .pie, .q-work, figure, .print-only, .solve-steps, .ans-steps, .ref-card, button')).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
      const story = setupFor(qEls[r]).map((n) => n.textContent.trim()).join(' '); // e.g. "Ava surveyed 30 students…" above #1
      const rec0 = progress[r], f = help.entries[r]?.fields;
      let mine;
      if (f && rec0?.cells) {
        mine = el('table', 'ref-table');
        const tr0 = el('tr');
        tr0.append(el('th'), ...f.cols.map((c) => el('th', '', c)));
        mine.append(tr0, ...f.rows.map((row, i) => { const tr = el('tr'); tr.append(el('th', '', row), ...f.cols.map((_, j) => el('td', '', rec0.cells[i]?.[j] || '–'))); return tr; }));
      } else mine = el('p', 'ref-ans', rec0?.answer ? `Your answer: ${rec0.answer}` : 'Not answered yet.');
      card.append(head, ...(story ? [el('p', 'ref-story', story)] : []), el('p', 'ref-q', qt), mine);
      if (rec0?.status) card.append(el('p', 'ref-status', rec0.status === 'right' ? '✓ checked: right' : rec0.status === 'wrong' ? '✗ checked: not right yet' : '• not checked yet'));
      stackFractions(card);
      host.querySelector(':scope > .q-meta').after(card);
    }
  }

  function setView(v) {
    view = v;
    document.body.dataset.view = v;
    for (const k of VIEWS) viewBtns[k].setAttribute('aria-pressed', String(k === v));
    try { localStorage.setItem('view', v); } catch { /* storage blocked */ }
    updateFocus();
    document.dispatchEvent(new Event('study-change')); // the calculator shows only this question's lines in Focus
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
  const missed = el('div', 'missed');
  let missedOpen = null; // the open "Practice what I missed" panel
  missed.hidden = true;
  panel.after(missed);
  missed.after(strip);
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

  // What to practice: this form's questions answered wrong (now or on any try), weighted by how often, mapped to
  // practice templates; plus any skill whose mastery fell under 50 on any form. Questions with no template are listed to review.
  function troubles() {
    const kinds = new Map(), review = [];
    for (const id of questions) {
      if (qEls[id].hidden) continue;
      const r = progress[id], misses = (r?.tries || []).filter((t) => !t.correct).length + (r?.status === 'wrong' ? 1 : 0);
      if (!misses) continue;
      const k = window.Practice?.kindFor(help.entries[id].skill);
      if (k) kinds.set(k, (kinds.get(k) || 0) + misses); else review.push(id);
    }
    for (const [k, m] of Object.entries(mastery)) if (window.Practice?.kinds[k] && m.tries && m.score < 50 && !kinds.has(k)) kinds.set(k, 1);
    return { kinds: [...kinds], review };
  }
  function renderMissed() {
    const { kinds, review } = troubles();
    missed.hidden = !kinds.length && !review.length;
    if (missed.hidden) return;
    const line = el('div', 'missed-line');
    if (kinds.length) {
      const b = el('button', 'practice-next', missedOpen && !missedOpen.hidden ? 'Hide practice' : 'Practice what I missed');
      b.type = 'button';
      b.addEventListener('click', () => {
        if (missedOpen && !missedOpen.hidden) { missedOpen.hidden = true; renderMissed(); return; }
        missedOpen?.remove();
        missedOpen = practicePanel(kinds);
        missed.append(missedOpen);
        renderMissed();
      });
      line.append(b, el('span', '', ` New problems for ${kinds.length} skill${kinds.length > 1 ? 's' : ''}: ${kinds.map(([k]) => window.Practice.kinds[k].label).join(', ')}.`));
    }
    if (review.length) {
      const r = el('span', 'missed-review', `${kinds.length ? ' ' : ''}Look again at: `);
      review.forEach((id, k) => {
        const a = el('a', '', labels[id]);
        a.href = `#q-${id}`;
        a.addEventListener('click', (e) => { if (view === 'focus') { e.preventDefault(); go(id); } });
        r.append(k ? ', ' : '', a);
      });
      line.append(r);
    }
    missed.firstChild?.classList?.contains('missed-line') ? missed.firstChild.replaceWith(line) : missed.prepend(line);
  }

  function render() {
    renderMissed();
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
      const a = el('a', '', (labels[t.id] || t.id) + (t.part || ''));
      a.href = `#q-${t.id}`;
      if (off) a.addEventListener('click', () => showLesson(n)); // show it again, then the link jumps to it
      a.addEventListener('click', () => { if (view === 'focus') go(t.id); });
      li.append(a, ` · “${t.answer}” · `, el('b', '', t.correct ? 'Right' : 'Not yet'), ` · ${new Date(t.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`);
      if (t.work?.length) { const w = el('span', 'work-note', ` · ${t.work.length} calculation${t.work.length > 1 ? 's' : ''}`); w.title = t.work.join('\n'); li.append(w); }
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
        const sums = calcBits(body.textContent); // read before fractions are stacked
        stackFractions(body);
        li.append(body);
        if (sums.length && window.Calc?.addLine) {
          const row = el('div', 'help-calc');
          for (const sum of sums) {
            const b = el('button', '', `+ ${sum}`);
            b.type = 'button';
            b.title = 'Add to the calculator';
            b.setAttribute('aria-label', `Add ${sum} to the calculator`);
            b.addEventListener('click', () => { study.current = id; window.Calc.addLine(sum); });
            row.append(b);
          }
          li.append(row);
        }
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

  // Each question's calculator work (math/calc.js), shown under its answer box.
  const workLines = (id) => (window.Calc?.workFor?.(id) || []).map((w) => `${w.expr}${w.result && !w.expr.includes('=') ? ` = ${w.result}` : w.result ? `  →  ${w.result}` : ''}`);
  function renderWork() {
    for (const id of questions) {
      const lines = workLines(id);
      works[id].hidden = !lines.length;
      if (!lines.length) continue;
      const list = el('ul');
      for (const l of lines) list.append(el('li', '', l));
      works[id].replaceChildren(el('div', 'q-work-head', `Calculator work (${lines.length})`), list);
    }
  }
  document.addEventListener('calc-change', renderWork);
  queueMicrotask(renderWork);

  // Tap-to-pick: multiple-choice letters and YES/NO options fill the answer box.
  function pickers(host, input) {
    if (!input) return; // e.g. the draw-a-pie box has no text box
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
    const skip = '.ans, .help, .answer, .q-meta, .helpbtn, .solve-steps, .ans-steps';
    const letter = (e) => !e.closest(skip) && e.textContent.trim().match(/^([A-H])\.(\s|$)/)?.[1];
    const out = [];
    for (const e of host.querySelectorAll('li, span, div, p')) {
      const l = letter(e);
      if (l && e.parentElement && [...e.parentElement.children].filter(letter).length >= 2) out.push([e, l]);
    }
    return out;
  }

  // ---- Read aloud: the question and its choices, with math said the way a teacher says it.
  function speechText(host) {
    const copy = withSetup(host);
    copy.querySelectorAll('.ans, .help, .helpbtn, .answer, .q-meta, .q-work, svg, .ans-steps, .solve-steps').forEach((x) => x.remove());
    copy.querySelectorAll('.f').forEach((f) => { const [a, b] = [...f.children].map((c) => c.textContent); f.replaceWith(` ${a} over ${b} `); });
    copy.querySelectorAll('li, p, tr, div').forEach((n) => n.append('. ')); // pause between choices and lines
    return copy.textContent
      .replace(/\bP\(([^()]*)\)/g, 'the probability of $1')
      .replace(/[·×]/g, ' times ').replace(/÷/g, ' divided by ').replace(/−/g, ' minus ').replace(/=/g, ' equals ')
      .replace(/(\d)\s*–\s*(\d)/g, '$1 to $2').replace(/ ~ /g, ', ').replace(/%/g, ' percent')
      .replace(/(\d+)\/(\d+)/g, '$1 over $2').replace(/\(\s*(-?\d+),\s*(-?\d+)\s*\)/g, 'the point $1 comma $2')
      .replace(/\s*\.\s*(\.\s*)+/g, '. ').replace(/\s+/g, ' ').trim();
  }
  let speaking = null;
  function readButton(host) {
    const b = el('button', 'q-tool', 'Read aloud');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    if (!('speechSynthesis' in window)) { b.hidden = true; return b; }
    const done = () => { b.textContent = 'Read aloud'; b.setAttribute('aria-pressed', 'false'); if (speaking === b) speaking = null; };
    b.addEventListener('click', () => {
      const wasMe = speaking === b;
      speechSynthesis.cancel();
      if (speaking) speaking.dispatchEvent(new Event('stop'));
      if (wasMe) return;
      const u = new SpeechSynthesisUtterance(speechText(host));
      u.lang = 'en-US';
      u.rate = 0.95;
      u.onend = done;
      u.onerror = done;
      speaking = b;
      b.textContent = 'Stop reading';
      b.setAttribute('aria-pressed', 'true');
      speechSynthesis.speak(u);
    });
    b.addEventListener('stop', done);
    return b;
  }

  // ---- Key info: underline the numbers and the words that change the answer, and highlight what's being asked.
  const CUES = /\b(not|NOT|never|no|at least|at most|more than|less than|fewer than|greater than|no more than|each|every|both|all that apply|in all|total|altogether|per|rate|probability|predict|expected?|estimate|how many|how much|how far|how long|which|weakest|strongest|best|most|least|mean|median|mode|range|random(?:ly)?|replaced|put back|without|first|second|then|after|before)\b/g;
  function keyInfoButton(host) {
    const b = el('button', 'q-tool', 'Key info');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    let marked = false;
    b.addEventListener('click', () => {
      if (!marked) { markKeyInfo(host); marked = true; }
      const on = !host.classList.contains('keyinfo-on');
      host.classList.toggle('keyinfo-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    return b;
  }
  function markKeyInfo(host) {
    const skip = '.ans, .help, .helpbtn, .answer, .q-meta, .q-work, .ans-steps, .solve-steps, svg, .f, mark, button';
    host.querySelectorAll('.f').forEach((f) => { if (!f.closest('.ans, .help, .answer')) f.classList.add('key-num'); });
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    const texts = [];
    for (let n; (n = walker.nextNode());) if (n.data.trim() && !n.parentElement.closest(skip)) texts.push(n);
    const re = new RegExp(`([^.?!]*\\?)|(\\d+(?:[.,]\\d+)*%?)|${CUES.source}`, 'g');
    for (const t of texts) {
      const parts = [];
      let last = 0;
      for (const m of t.data.matchAll(re)) {
        if (m.index > last) parts.push(document.createTextNode(t.data.slice(last, m.index)));
        if (m[1]) { // the sentence that asks: highlight it, and still mark numbers and cue words inside
          const ask = el('span', 'key-ask');
          ask.innerHTML = m[1].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(new RegExp(`(\\d+(?:[.,]\\d+)*%?)|${CUES.source}`, 'g'), (w, num) => `<mark class="${num ? 'key-num' : 'key-cue'}">${w}</mark>`);
          parts.push(ask);
        } else parts.push(Object.assign(el('mark', m[2] ? 'key-num' : 'key-cue'), { textContent: m[0] }));
        last = m.index + m[0].length;
      }
      if (!parts.length) continue;
      if (last < t.data.length) parts.push(document.createTextNode(t.data.slice(last)));
      t.replaceWith(...parts);
    }
  }

  // ---- Step by step: the "This problem" walkthrough, one step at a time. Two places use it: the tool row on
  // each question (open any time) and the answer key (with Show answers).
  function walkSteps(entry) {
    const steps = (entry.hints?.[2] || '').replace(/<[^>]+>/g, '').split(/(?<=[.!?])\s+(?=[A-Z0-9(“"])/).map((x) => x.trim()).filter(Boolean);
    return steps.length >= 2 ? steps : null;
  }
  function stepper(steps, cls, first = 'Step by step', onConfused = null) {
    const wrap = el('div', cls);
    const btn = el('button', '', first);
    btn.type = 'button';
    const list = el('ol');
    let shown = 0;
    const next = () => {
      if (shown === steps.length) { list.replaceChildren(); shown = 0; } // "Start over"
      const text = steps[shown++];
      const li = el('li');
      const body = el('span', '', text);
      stackFractions(body);
      li.append(body);
      if (onConfused) {
        const huh = el('button', 'step-huh', 'I don’t get this step');
        huh.type = 'button';
        const out = el('div', 'step-help');
        out.setAttribute('aria-live', 'polite');
        huh.addEventListener('click', () => onConfused(text, out, huh));
        li.append(' ', huh, out);
      }
      list.append(li);
      btn.textContent = shown < steps.length ? `Next step (${shown + 1} of ${steps.length})` : 'Start over';
    };
    btn.addEventListener('click', next);
    wrap.append(list, btn);
    return { wrap, next };
  }
  function answerSteps(host, id, entry) {
    const anss = host.querySelectorAll(':scope .ans');
    const steps = walkSteps(entry);
    if (anss.length && steps) anss[anss.length - 1].after(stepper(steps, 'ans-steps', 'Step by step', confused(host, id, entry)).wrap);
  }
  // "I don't get this step": the tutor explains that one step; without it, the similar worked example from the hints.
  function confused(host, id, entry) {
    return async (stepText, out, btn) => {
      if (!local) {
        out.replaceChildren(el('b', '', 'A similar example: '));
        const ex = el('span');
        ex.innerHTML = entry.hints[1].replace(/^Example:\s*/, ''); // our own checked content from help.json
        stackFractions(ex);
        out.append(ex);
        return;
      }
      btn.disabled = true;
      out.textContent = '…';
      try {
        const r = await post('/api/ask', { page, id, step: 3, question: questionText(host),
          message: `I don't understand this step of the solution: "${stepText}" Explain just this step in simpler words: what it does and why, with a tiny example using different numbers.` });
        if (!r.ok) throw new Error();
        out.textContent = (await r.text()).replace(/```[a-z]*\n?/g, '');
        stackFractions(out);
      } catch { out.textContent = 'The tutor isn’t available right now.'; } finally { btn.disabled = false; }
    };
  }
  // The question for the whiteboard: its words without graphs (their axis labels read as noise), parts spaced out.
  function boardQuestion(host) {
    const copy = withSetup(host);
    copy.querySelectorAll('.ans, .help, .helpbtn, .answer, .q-meta, .q-work, .solve-steps, .ans-steps, .practice, svg, figure').forEach((x) => x.remove());
    copy.querySelectorAll('.f').forEach((f) => { const [a, b] = [...f.children].map((c) => c.textContent); f.replaceWith(`${a}/${b}`); });
    copy.querySelectorAll('li, p, tr, div').forEach((n) => n.append(' '));
    const text = copy.textContent.replace(/\s+/g, ' ').trim();
    const graph = host.querySelector('svg, figure') ? ' (See the graph on the page.)' : '';
    return (text.length > 300 ? `${text.slice(0, 297)}…` : text) + graph;
  }

  // "Pie chart": the question's data as a pie whose edges can be dragged (math/pie.js), with count, fraction, % and degrees.
  function pieButton(host, entry) {
    const b = el('button', 'q-tool', 'Pie chart');
    b.type = 'button';
    b.setAttribute('aria-expanded', 'false');
    if (!entry.pie) { b.hidden = true; return b; }
    let panel = null;
    b.addEventListener('click', () => {
      if (!window.Pie) return;
      if (!panel) { panel = window.Pie.make(entry.pie); const at = host.querySelector(':scope > form.answer, :scope > .helpbtn'); at ? at.before(panel) : host.append(panel); } else panel.hidden = !panel.hidden;
      b.setAttribute('aria-expanded', String(!panel.hidden));
    });
    return b;
  }

  // "Watch it": the whiteboard walkthrough (math/board.js) for a question or a practice problem.
  function watchButton(get, show = true, id = null) {
    const b = el('button', 'q-tool', 'Watch it');
    b.type = 'button';
    if (!show) { b.hidden = true; return b; }
    b.addEventListener('click', () => {
      if (!window.Board) return;
      window.Board.play(get());
      if (local && id) post('/api/log', { page, id, step: 3 }).catch(() => {});
    });
    return b;
  }
  function solveButton(host, id, entry) {
    const b = el('button', 'q-tool', 'Step by step');
    b.type = 'button';
    b.setAttribute('aria-expanded', 'false');
    const steps = walkSteps(entry);
    if (!steps) { b.hidden = true; return b; }
    let s = null;
    b.addEventListener('click', () => {
      if (!s) {
        s = stepper(steps, 'solve-steps', 'Step by step', confused(host, id, entry));
        const head = el('div', 'solve-head', 'Solving it step by step');
        s.wrap.prepend(head);
        (host.querySelector(':scope > .answer') || host.querySelector('.answer') || host.lastElementChild).after(s.wrap);
        s.next();
        if (local) post('/api/log', { page, id, step: 3 }).catch(() => {});
      } else s.wrap.hidden = !s.wrap.hidden;
      b.setAttribute('aria-expanded', String(!s.wrap.hidden));
    });
    return b;
  }

  // ---- Practice more like this: new problems for the question's skill (math/practice.js), with a mastery score per skill
  // kept in this browser and shared by every form (like IXL's SmartScore: gains shrink near the top, a miss costs points).
  const levelOf = (score) => LEVELS.find(([min]) => score >= min)[1];
  function score(kind, right) {
    const m = (mastery[kind] ||= { score: 0, tries: 0, right: 0 });
    m.tries++;
    if (right) { m.right++; m.score = Math.min(100, m.score + (m.score < 50 ? 10 : m.score < 80 ? 7 : m.score < 90 ? 5 : 3)); }
    else m.score = Math.max(0, m.score - (m.score >= 80 ? 8 : m.score >= 50 ? 5 : 3));
    m.last = Date.now();
    try { localStorage.setItem('mastery', JSON.stringify(mastery)); } catch { /* storage blocked */ }
    practiceButtons.forEach((f) => f());
  }
  function practiceButton(host, entry) {
    const kind = window.Practice?.kindFor(entry.skill);
    const b = el('button', 'q-tool', 'Practice');
    b.type = 'button';
    b.setAttribute('aria-expanded', 'false');
    if (!kind) { b.hidden = true; return b; }
    const label = () => { const m = mastery[kind]; b.textContent = m ? `Practice · ${m.score}` : 'Practice'; b.title = m ? `${window.Practice.kinds[kind].label}: ${m.score}/100, ${levelOf(m.score)}` : ''; };
    practiceButtons.push(label);
    label();
    let panel = null;
    b.addEventListener('click', () => {
      if (!panel) { panel = practicePanel(kind); (host.querySelector(':scope > .answer') || host.lastElementChild).after(panel); } else panel.hidden = !panel.hidden;
      b.setAttribute('aria-expanded', String(!panel.hidden));
    });
    return b;
  }
  // kinds: one kind, or [[kind, weight], …] for a mixed set (Practice what I missed): each new problem picks a kind,
  // more often the more it was missed.
  function practicePanel(kinds) {
    const mix = Array.isArray(kinds) ? kinds : [[kinds, 1]];
    const pick = () => { let r = Math.random() * mix.reduce((t, [, w]) => t + w, 0); for (const [k, w] of mix) if ((r -= w) < 0) return k; return mix[0][0]; };
    let kind = mix[0][0], done = 0, gotRight = 0;
    const box = el('div', 'practice');
    const head = el('div', 'practice-head');
    const meter = el('div', 'practice-meter');
    const fill = el('span');
    meter.append(fill);
    meter.setAttribute('role', 'img');
    const showScore = () => {
      const s = mastery[kind]?.score || 0;
      fill.style.width = `${s}%`;
      meter.setAttribute('aria-label', `Mastery ${s} out of 100, ${levelOf(s)}`);
      head.replaceChildren(el('b', '', `${mix.length > 1 ? `Problem ${done + 1} · ` : 'Practice: '}${window.Practice.kinds[kind].label}`),
        el('span', 'practice-score', `${s}/100 · ${levelOf(s)}${mix.length > 1 && done ? ` · ${gotRight} of ${done} right` : ''}`));
    };
    practiceButtons.push(showScore);
    const body = el('div');
    box.append(head, meter, body);
    const next = () => {
      if (mix.length > 1) { let k = pick(); if (k === kind) k = pick(); kind = k; } // mixed: try not to repeat a skill twice in a row
      const p = window.Practice.make(kind);
      let counted = false, helped = false;
      const q = el('p', 'practice-q', p.q);
      stackFractions(q);
      const form = el('form', 'answer');
      const input = el('input');
      input.placeholder = p.choice ? 'yes or no' : 'Your answer';
      input.setAttribute('aria-label', 'Your answer to the practice problem');
      input.autocomplete = 'off';
      const check = el('button', '', 'Check');
      check.type = 'submit';
      const result = el('div', 'answer-result');
      result.setAttribute('aria-live', 'polite');
      form.append(input, check, result);
      if (p.choice) for (const yn of ['yes', 'no']) {
        const c = el('button', 'practice-yn', yn[0].toUpperCase() + yn.slice(1));
        c.type = 'button';
        c.addEventListener('click', () => { input.value = yn; form.requestSubmit(); });
        form.insertBefore(c, check);
      } else mathAnswer(input, form);
      const tools = el('div', 'practice-tools');
      const hint = el('button', 'q-tool', 'Hint');
      const steps = el('button', 'q-tool', 'Step by step');
      const again = el('button', 'practice-next', 'New problem');
      for (const x of [hint, steps, again]) x.type = 'button';
      const watch = watchButton(() => { helped = true; return { title: `Watch it: ${window.Practice.kinds[kind].label}`, question: p.q, steps: p.steps }; });
      const extra = el('div');
      hint.addEventListener('click', () => { helped = true; const h = el('p', 'step-help', p.hint); stackFractions(h); extra.replaceChildren(h); });
      steps.addEventListener('click', () => {
        helped = true;
        const st = stepper(p.steps, 'solve-steps', 'Step by step', (text, out) => { out.textContent = p.hint; });
        extra.replaceChildren(st.wrap);
        st.next();
      });
      again.addEventListener('click', next);
      tools.append(hint, steps, watch, again);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const ok = window.Practice.check(p, input.value);
        if (ok == null) { result.textContent = p.choice ? 'Answer yes or no.' : 'I can’t read that as a number yet. Try something like 3/10, 0.3, (2, −5) or y = 3x.'; return; }
        if (!counted) { counted = true; done++; gotRight += ok ? 1 : 0; if (!(ok && helped)) score(kind, ok); }
        form.classList.toggle('right', ok);
        form.classList.toggle('wrong', !ok);
        result.replaceChildren(el('b', '', ok ? '✓ Right! ' : '✗ Not yet. '), ok ? (helped ? 'Nice. Try one on your own next to raise your score.' : '') : 'Try again, or use Hint or Step by step.');
        if (ok) again.focus();
      });
      body.replaceChildren(q, form, tools, extra);
      showScore();
    };
    next();
    return box;
  }

  // Questions with one clean answer (help.json "answer") get a MathLive field on first tap: fractions stack as you type.
  // The plain input stays (hidden) and holds the text, so saving, progress and Check work unchanged.
  function mathAnswer(input, box) {
    input.addEventListener('focus', async function upgrade() {
      input.removeEventListener('focus', upgrade);
      if (!(await window.Calc?.loadMathLive?.())) return; // no MathLive: the plain box keeps working
      const mf = new window.MathfieldElement();
      mf.className = 'answer-math';
      mf.setAttribute('aria-label', input.getAttribute('aria-label') || 'Your answer');
      mf.mathModeSpace = '\\:';
      mf.smartFence = true;
      mf.value = window.Calc.toLatex(input.value);
      input.after(mf);
      input.hidden = true;
      mf.inlineShortcuts = {}; // needs the field on the page
      mf.addEventListener('input', () => { input.value = window.Calc.fromAscii(mf.getValue('ascii-math')); input.dispatchEvent(new Event('input')); });
      // Enter checks; caught on the form, before MathLive handles the key inside its field.
      box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.composedPath().includes(mf)) { e.preventDefault(); e.stopPropagation(); box.requestSubmit(); } }, true);
      mf.addEventListener('beforeinput', (e) => { if (e.inputType === 'insertLineBreak') { e.preventDefault(); box.requestSubmit(); } });
      mf.focus();
    });
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
      const note = got.size === 1 && key.notes?.[[...got][0]]; // why that wrong choice is tempting (help.json "wrong")
      return { correct: ok, feedback: ok ? '' : note ? `${note} Try again.` : key.letters.size > 1 ? 'Look at each choice again: one of yours is off, or one is missing. Help has a hint.' : 'Try another choice, or open Help for a hint.' };
    }
    const got = Object.fromEntries([...answer.matchAll(/(\d+[a-z])\s*(YES|NO)/gi)].map((m) => [m[1].toLowerCase(), m[2].toUpperCase()]));
    const wrong = Object.keys(key.rows).filter((k) => got[k] !== key.rows[k]);
    const missing = wrong.filter((k) => !got[k]);
    const feedback = !wrong.length ? '' : missing.length === wrong.length ? `Answer ${missing.join(', ')} too.`
      : `${wrong.length === 1 ? 'One row isn’t' : `${wrong.length} rows aren’t`} right yet:\n${wrong.map((k) => `${k}: ${got[k] ? key.why?.[k] || 'Work this one out again.' : 'not answered yet.'}`).join('\n')}`;
    return { correct: !wrong.length, feedback, rows: got };
  }

  // "3/10" in hints and feedback shown as a stacked fraction, like the printed tests (.f in form.css).
  function stackFractions(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    for (let n; (n = walker.nextNode());) if (/\d\/\d/.test(n.data) && !n.parentElement.closest('.f, button')) texts.push(n);
    for (const t of texts) {
      const parts = t.data.split(/(?<![\d.])(\d+(?:\.\d+)?\/\d+(?:\.\d+)?)(?!\d|\.\d)/); // a sentence's last "." is fine
      t.replaceWith(...parts.map((p, i) => {
        if (i % 2 === 0) return document.createTextNode(p);
        const [a, b] = p.split('/');
        const f = el('span', 'f');
        f.setAttribute('aria-label', `${a} over ${b}`);
        f.append(el('span', '', a), el('span', '', b));
        return f;
      }));
    }
  }

  // Calculations written in a hint ("9 · 8 = 72", "4/12", "20% of 80"), left side only, for the "+" buttons.
  function calcBits(text) {
    const n = '\\d+(?:\\.\\d+)?%?(?:/\\d+(?:\\.\\d+)?)?';
    const re = new RegExp(`${n}(?:(?:\\s*[·×*÷+−-]\\s*|(?<=%)\\s+of\\s+)${n})*`, 'g'); // "of" only after a %: "4 of 12" is words
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const out = [];
    for (const m of text.matchAll(re)) {
      const s = m[0].trim(), f = s.match(/^(\d+)\/(\d+)$/);
      const worth = f ? gcd(+f[1], +f[2]) > 1 : /[·×*÷+−-]|\bof\b/.test(s); // a lone fraction only if it still simplifies (4/12, not 1/3)
      if (worth && !out.includes(s)) out.push(s);
    }
    return out.slice(0, 4);
  }

  // The part's setup that a question depends on: e.g. "A spinner has 12 equal sections… Find each probability" above
  // Part II #1-4. It's the paragraphs between the part's header (or the previous group of questions) and this question.
  function setupFor(node) {
    const q = node.closest?.('[id^="q-"]') || node;
    const part = q.closest('section.part');
    if (!part) return [];
    let top = q;
    while (top.parentElement && top.parentElement !== part) top = top.parentElement;
    const out = [];
    for (let n = top.previousElementSibling; n && !n.matches('.hd, .cols, .q, .task, h2'); n = n.previousElementSibling) out.unshift(n);
    return out;
  }
  function withSetup(host) { const copy = host.cloneNode(true); copy.prepend(...setupFor(host).map((n) => { const c = n.cloneNode(true); c.append(' '); return c; })); return copy; }

  // The question's own text, without the key, help or answer box, for the tutor.
  function questionText(host) {
    const copy = withSetup(host);
    copy.querySelectorAll('.ans, .help, .helpbtn, .answer, .q-meta, .q-work, .solve-steps, .ans-steps').forEach((x) => x.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  // A part's key read straight off the answer key when it's one number: "40 plants" -> 40, "3,000 feet. The flat…" -> 3000,
  // "… = 14/40 = 7/20" -> 7/20. Anything else (ratios, sentences) is left to the tutor.
  function plainNum(s) { return s.replace(/(\d),(?=\d{3}\b)/g, '$1'); }
  // The answer key's text, fractions written a/b ('?' when one side isn't a plain number).
  function ansText(node) {
    const c = node.querySelector(':scope > .ans')?.cloneNode(true);
    if (!c) return '';
    c.querySelector('.src')?.remove();
    c.querySelectorAll('.f').forEach((f) => { const [a, b] = [...f.children].map((x) => x.textContent.trim()); f.replaceWith(/^\d+$/.test(a) && /^\d+$/.test(b) ? `${a}/${b}` : '?'); });
    return plainNum(c.textContent.replace(/\s+/g, ' ').trim());
  }
  function partKey(text) {
    const t = text.replace(/\s*\([^()]*\)\.?$/, ''); // drop a closing aside: "= 1/15 (only 2 yellow are left)."
    const n = '(-?\\d+(?:\\.\\d+)?(?:/\\d+)?)';
    const m = t.match(new RegExp(`^${n}\\s*(?:[a-z²]+(?:\\s+per\\s+[a-z]+)?)?\\s*(?:[.(]|$)`, 'i')) || t.match(new RegExp(`=\\s*${n}\\s*[a-z²]*\\.?$`, 'i'));
    return m ? { answer: m[1], units: true } : null;
  }
  // A question's parts: a list (ol.sub) under it, or "(a) … (b) … (c) …" inside the question when the key is split the same way.
  function partsOf(host, entry) {
    // help.json "parts": labeled boxes for answers the question asks for in words ("Make at least two inferences"); the tutor checks each.
    if (entry?.parts) return entry.parts.map((label, k) => ({ letter: 'abcdefgh'[k], prompt: label, label, keyText: '', count: entry.parts.length }));
    const lis = [...host.querySelectorAll('ol.sub > li')];
    if (lis.length > 1) return lis.map((li, k) => ({ letter: 'abcdefgh'[k], li, count: lis.length, keyText: ansText(li), prompt: questionText(li) }));
    const q = questionText(host).split(/\(([a-h])\)\s*/), key = ansText(host).split(/\(([a-h])\)\s*/);
    if (q.length < 5 || key.length !== q.length) return [];
    const out = [];
    for (let k = 1; k < q.length; k += 2) {
      if (q[k] !== key[k] || q[k] !== 'abcdefgh'[out.length]) return [];
      out.push({ letter: q[k], prompt: q[k + 1].trim(), keyText: key[k + 1].trim() });
    }
    out.forEach((p) => { p.count = out.length; });
    return out;
  }

  // "Color the spinner": while the "Red sections" / "Blue sections" / … boxes are typed in, the blank spinner on the
  // question fills in with those colors, in order around the circle (on screen only; the printed test stays blank).
  function spinnerPainter(host, f, cells) {
    const SPIN_COLORS = { red: '#e5484d', blue: '#3b82f6', yellow: '#f5c518', green: '#30a46c', orange: '#f76b15', purple: '#8e4ec6' };
    const svg = [...host.querySelectorAll('svg')].find((x) => /spinner with (\d+)/i.test(x.getAttribute('aria-label') || ''));
    const circle = svg?.querySelector('circle');
    const colored = f.rows.map((row, i) => [row.match(/^(\w+) sections$/i)?.[1]?.toLowerCase(), i]).filter(([c]) => SPIN_COLORS[c]);
    if (!circle || !colored.length) return () => {};
    const n = +svg.getAttribute('aria-label').match(/spinner with (\d+)/i)[1];
    const [cx, cy, r] = ['cx', 'cy', 'r'].map((a) => +circle.getAttribute(a));
    const pt = (k) => { const a = (k / n) * 2 * Math.PI - Math.PI / 2; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; };
    const NS = 'http://www.w3.org/2000/svg';
    const layer = document.createElementNS(NS, 'g');
    layer.setAttribute('class', 'spin-fill');
    circle.after(layer); // above the circle's fill, under the section lines
    const label = svg.getAttribute('aria-label');
    return () => {
      layer.replaceChildren();
      let k = 0;
      const said = [];
      for (const [color, i] of colored) {
        const count = Math.max(0, Math.min(n - k, parseInt(cells[i][0].value, 10) || 0));
        for (let m = 0; m < count; m++, k++) {
          const p = document.createElementNS(NS, 'path');
          p.setAttribute('d', `M${cx},${cy} L${pt(k)} A${r},${r} 0 0 1 ${pt(k + 1)} Z`);
          p.setAttribute('fill', SPIN_COLORS[color]);
          layer.append(p);
        }
        if (count) said.push(`${count} ${color}`);
      }
      svg.setAttribute('aria-label', said.length ? `Spinner with ${n} sections: ${said.join(', ')}${k < n ? `, ${n - k} blank` : ''}` : label);
    };
  }

  // "Draw and label a pie chart": draw it freehand (math/pie.js Pie.freehand), then Check says which sectors are
  // close enough (within 5°) and which are too big or too small.
  function drawBox(id, data) {
    const box = el('form', 'answer draw');
    const r0 = progress[id];
    const check = el('button', '', 'Check');
    check.type = 'submit';
    const result = el('div', 'answer-result');
    result.setAttribute('aria-live', 'polite');
    const text = (st) => window.Pie.slices(st.lines).map((x) => `${st.labels[x.id] || '?'} ${Math.round(x.size)}°`).join(', ');
    const pie = window.Pie?.freehand(data, { start: r0?.cells?.lines ? r0.cells : null, onChange: (st) => {
      const r = rec(id);
      r.cells = st; r.answer = text(st); r.status = st.lines.length ? 'answered' : ''; delete r.feedback;
      save(); render();
      box.classList.remove('right', 'wrong'); result.textContent = '';
    } });
    if (!pie) { box.append(el('p', '', 'The pie tool didn’t load. Draw it on paper.')); return box; }
    box.append(pie, check, result);
    const show = (ok, feedback) => { box.classList.add(ok ? 'right' : 'wrong'); result.replaceChildren(el('b', '', ok ? '✓ Close enough! ' : '✗ Not yet. '), feedback || ''); };
    if (r0?.status === 'right' || r0?.status === 'wrong') show(r0.status === 'right', r0.feedback);
    box.addEventListener('submit', (e) => {
      e.preventDefault();
      const g = pie.grade(5);
      const feedback = g.msg || (g.ok ? 'Every sector is within 5° of the right size.' : `${g.rows.map((x) => x.msg).join('\n')}\nUse your degrees from #1.`);
      if (g.msg) { result.textContent = g.msg; return; } // not finished drawing: no try counted
      pie.allowTargets(); // after a real check, the student may show where each sector should end
      const p = rec(id);
      p.status = g.ok ? 'right' : 'wrong'; p.feedback = feedback; p.cells = pie.state();
      p.tries.push({ answer: text(p.cells), correct: g.ok, t: Date.now() });
      save(); render();
      show(g.ok, feedback);
    });
    return box;
  }

  function fieldsBox(id, f, host) {
    const box = el('form', 'answer fields');
    const grid = el('table', 'fields-grid');
    const r0 = progress[id];
    // An answer typed in the old single box ("Hawks = 33, 38.5, …, Owls = 44, …"): its numbers, in order, fill the boxes
    // when there is exactly one per box.
    const nums = !r0?.cells && r0?.answer ? r0.answer.match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || [] : [];
    const oldCells = nums.length === f.rows.length * f.cols.length ? nums : null;
    const cells = f.rows.map((row, i) => f.cols.map((c, j) => {
      const input = el('input');
      input.inputMode = /\d/.test(f.answers[i][j]) ? 'decimal' : 'text';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', `${row}${c ? ` ${c}` : ''}`);
      input.value = r0?.cells?.[i]?.[j] ?? oldCells?.[i * f.cols.length + j] ?? '';
      return input;
    }));
    // Five stats for two data sets fit a narrow column better as five rows: stats down the side, data sets across.
    const flip = f.cols.length > f.rows.length && f.cols.length > 1;
    const down = flip ? f.cols : f.rows, across = flip ? f.rows : f.cols;
    const at = (a, b) => (flip ? cells[b][a] : cells[a][b]);
    if (across.length > 1 && across.some(Boolean)) { const tr = el('tr'); tr.append(el('th'), ...across.map((c) => el('th', '', c))); const head = el('thead'); head.append(tr); grid.append(head); }
    down.forEach((label, a) => {
      const tr = el('tr');
      const th = el('th', '', across.length === 1 && across[0] ? `${label} · ${across[0]}` : label);
      th.scope = 'row';
      tr.append(th);
      across.forEach((_, b) => { const td = el('td'); td.append(at(a, b)); tr.append(td); });
      grid.append(tr);
    });
    const all = cells.flat();
    const paint = spinnerPainter(host, f, cells);
    paint();
    for (const c of all) c.addEventListener('input', paint);
    const text = () => f.rows.map((row, i) => `${row}: ${cells[i].map((c, j) => `${f.cols[j] ? `${f.cols[j]} ` : ''}${c.value.trim() || '?'}`).join(', ')}`).join('; ');
    const result = el('div', 'answer-result');
    result.setAttribute('aria-live', 'polite');
    const check = el('button', '', 'Check');
    check.type = 'submit';
    const show = (ok, feedback) => { box.classList.add(ok ? 'right' : 'wrong'); result.replaceChildren(el('b', '', ok ? '✓ Right! ' : '✗ Not yet. '), feedback || ''); };
    const mark = () => {
      let right = 0;
      cells.forEach((row, i) => row.forEach((c, j) => {
        const want = f.answers[i][j], typed = c.value.trim();
        const ok = /\d/.test(want) ? window.Calc?.equivalent?.(typed, want) === true : want.toLowerCase().split('|').includes(typed.toLowerCase().replace(/\.$/, ''));
        c.classList.toggle('right', ok); c.classList.toggle('wrong', !ok);
        right += ok;
      }));
      return right;
    };
    if (r0?.status === 'right' || r0?.status === 'wrong') { show(r0.status === 'right', r0.feedback); mark(); }
    for (const input of all) input.addEventListener('input', () => {
      const r = rec(id);
      r.cells = cells.map((row) => row.map((c) => c.value));
      r.answer = text();
      r.status = all.some((c) => c.value.trim()) ? 'answered' : '';
      delete r.feedback;
      save(); render();
      box.classList.remove('right', 'wrong');
      input.classList.remove('right', 'wrong');
      result.textContent = '';
    });
    box.addEventListener('submit', (e) => {
      e.preventDefault();
      const empty = all.filter((c) => !c.value.trim()).length;
      if (empty) { result.textContent = `Fill in every box first (${empty} empty).`; all.find((c) => !c.value.trim()).focus(); return; }
      const right = mark();
      const ok = right === all.length;
      const feedback = ok ? '' : `${right} of ${all.length} boxes are right. Fix the ones marked in orange, or open Help for a hint.`;
      const p = rec(id);
      p.status = ok ? 'right' : 'wrong';
      p.feedback = feedback;
      const work = workLines(id);
      p.tries.push({ answer: text(), correct: ok, t: Date.now(), ...(work.length ? { work } : {}) });
      save(); render();
      show(ok, feedback);
    });
    // Enter in a box moves to the next one; in the last box it checks.
    const order = down.flatMap((_, a) => across.map((__, b) => at(a, b)));
    order.forEach((c, k) => c.addEventListener('keydown', (e) => { if (e.key === 'Enter' && k < order.length - 1) { e.preventDefault(); order[k + 1].focus(); } }));
    box.append(grid, check, result);
    return box;
  }

  function answerBox(id, host, big, part = null) {
    const box = el('form', 'answer');
    const input = el(big ? 'textarea' : 'input');
    if (big) input.rows = 3;
    input.maxLength = 500;
    const key = part ? partKey(part.keyText) : help.entries?.[id]?.answer ? { answer: help.entries[id].answer } : autoKey(host);
    // A part keeps its own answer in progress["II-8.a"]; checks and history go on the question.
    const rid = part ? `${id}.${part.letter}` : id;
    const name = part ? `${id} part ${part.letter}` : id;
    const combine = () => {
      if (!part) return;
      const st = [...'abcdefgh'.slice(0, part.count)].map((l) => progress[`${id}.${l}`]?.status || '');
      rec(id).status = st.every((x) => x === 'right') ? 'right' : st.includes('wrong') ? 'wrong' : st.some(Boolean) ? 'answered' : '';
    };
    if (key?.letters) key.notes = help.entries?.[id]?.wrong || {};
    if (key?.rows) key.why = help.entries?.[id]?.why || {};
    input.placeholder = key?.answer ? 'Your answer' : key ? 'Tap a choice or type it' : local ? 'Your answer' : 'Your answer (Check needs the tutor)';
    if (key?.answer) mathAnswer(input, box);
    input.setAttribute('aria-label', `Your answer to ${name}`);
    if (part) input.placeholder = `Part ${part.letter}: ${input.placeholder.toLowerCase()}`;
    if (part && !part.li) { const short = part.prompt.length > 70 ? `${part.prompt.slice(0, 67)}…` : part.prompt; box.prepend(el('div', 'part-label', part.label || `(${part.letter}) ${short}`)); }
    if (part?.label) input.placeholder = local ? 'Your answer' : 'Your answer (Check needs the tutor)';
    const r0 = progress[rid];
    input.value = r0?.answer || '';
    const result = el('div', 'answer-result');
    result.setAttribute('aria-live', 'polite');
    // YES/NO rows: a ✓ or ✗ on each row's statement, so it's clear which one to fix.
    const markRows = (answer) => {
      const got = key?.rows ? autoCheck(key, answer).rows : null;
      host.querySelectorAll('.tf > *').forEach((n) => {
        const tag = n.textContent.trim().match(/^(\d+[a-z])\./i)?.[1]?.toLowerCase();
        n.classList.remove('tf-right', 'tf-wrong');
        if (got && tag && key.rows[tag] && got[tag]) n.classList.add(got[tag] === key.rows[tag] ? 'tf-right' : 'tf-wrong');
      });
    };
    const showResult = (correct, feedback) => {
      if (key?.rows) markRows(input.value);
      box.classList.add(correct ? 'right' : 'wrong');
      result.replaceChildren(el('b', '', correct ? '✓ Right! ' : '✗ Not yet. '), feedback || '');
      stackFractions(result);
    };
    if (r0?.status === 'right' || r0?.status === 'wrong') showResult(r0.status === 'right', r0.feedback);
    input.addEventListener('input', () => {
      const r = rec(rid);
      r.answer = input.value;
      r.status = input.value.trim() ? 'answered' : '';
      delete r.feedback;
      combine();
      if (key?.rows) markRows('');
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
        if (key?.answer) {
          // a part's key may have units ("40 plants"): read "40 plants" or "3,000 feet" as the number
          const typed = key.units ? plainNum(answer).replace(/^(-?[\d.\/\s]+?)\s*[a-z²][a-z²\s]*\.?$/i, '$1') : answer;
          const same = window.Calc?.equivalent?.(typed, key.answer);
          if (same == null) { result.textContent = 'I can’t read that as a number yet. Try something like 3/10, 0.3, (2, −5) or y = 3x.'; return; }
          correct = same;
          feedback = same ? '' : 'Not the same value. Check each step, or open Help for a hint.';
        } else if (key) ({ correct, feedback } = autoCheck(key, answer));
        else {
          const question = questionText(host) + (part ? ` (Check only part ${part.letter}: ${part.prompt})` : '');
          const r = await post('/api/check', { page, id, question, answer, work: workLines(id) });
          if (!r.ok) throw new Error();
          ({ correct, feedback } = await r.json());
        }
        const p = rec(rid);
        p.status = correct ? 'right' : 'wrong';
        p.feedback = feedback;
        const work = workLines(id);
        rec(id).tries.push({ answer, correct, t: Date.now(), ...(part ? { part: part.letter } : {}), ...(work.length ? { work } : {}) });
        combine();
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
    // One tap for the usual "I still don't get it" requests.
    const ways = el('div', 'help-ways');
    for (const [label, message] of [
      ['Explain it another way', 'Explain this a different way than the hints did.'],
      ['Simpler words', 'Explain this again in simpler words, like for a younger student.'],
      ['Real-life example', 'Explain the idea with a real-life example, using different numbers than the problem.'],
      ['Show me with a picture', 'Explain it with a simple picture made of text (a table, a list or a number line), using different numbers than the problem.'],
    ]) {
      const b = el('button', '', label);
      b.type = 'button';
      b.addEventListener('click', () => ask(message));
      ways.append(b);
    }
    box.append(ways, input, send, reply);
    const ask = async (message) => {
      if (!message || send.disabled) return;
      send.disabled = true;
      ways.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      reply.textContent = '…';
      try {
        const r = await post('/api/ask', { page, id, step: getStep(), question: questionText(host), message });
        if (!r.ok) throw new Error(await r.text());
        reply.textContent = '';
        const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
        for (let c; !(c = await reader.read()).done;) reply.textContent += c.value;
        reply.textContent = reply.textContent.replace(/```[a-z]*\n?/g, ''); // text pictures keep their layout (pre-wrap), minus the fences
        stackFractions(reply);
        return true;
      } catch (err) {
        reply.textContent = err.message || "The tutor isn't available right now.";
      } finally {
        send.disabled = false;
        ways.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      }
    };
    box.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (await ask(input.value.trim())) input.value = '';
    });
    return box;
  }
})();
