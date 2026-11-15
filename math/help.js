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
  const questions = [];
  document.querySelectorAll('section.part').forEach((part, i) => {
    part.querySelectorAll('.q, .task').forEach((q) => {
      const n = q.querySelector(':scope > .n');
      const id = q.classList.contains('task') ? ROMAN[i] : n && `${ROMAN[i]}-${parseInt(n.textContent, 10)}`;
      const entry = id && help.entries?.[id];
      if (!entry) return;
      questions.push(id);
      q.id = `q-${id}`;
      labels[id] = id.includes('-') ? `Part ${id.replace('-', ' #')}` : `Part ${id}`;
      marks[id] = el('span', 'mark');
      (n || q).prepend(marks[id]);
      const host = q.classList.contains('task') ? q : q.lastElementChild;
      host.append(answerBox(id, host, q.classList.contains('task')));
      attach(host, id, entry);
    });
  });

  // Summary and history at the top of the page.
  const panel = el('details', 'progress');
  const summary = el('summary');
  const list = el('ul', 'progress-list');
  panel.append(summary, list);
  document.querySelector('section.part')?.before(panel);
  render();

  function render() {
    const by = (st) => questions.filter((id) => progress[id]?.status === st).length;
    const done = questions.filter((id) => progress[id]?.status).length;
    summary.textContent = `Progress: ${done} of ${questions.length} answered · ${by('right')} right · ${by('wrong')} to fix · ${by('answered')} not checked`;
    for (const id of questions) {
      const st = progress[id]?.status || '';
      marks[id].textContent = MARK[st] || '';
      marks[id].dataset.status = st;
      marks[id].title = MARK_TEXT[st] || '';
    }
    const tries = Object.entries(progress).flatMap(([id, r]) => (r.tries || []).map((t) => ({ id, ...t }))).sort((a, b) => b.t - a.t);
    list.replaceChildren(...(tries.length ? tries.map((t) => {
      const li = el('li', t.correct ? 'right' : 'wrong');
      const a = el('a', '', labels[t.id] || t.id);
      a.href = `#q-${t.id}`;
      li.append(a, ` · “${t.answer}” · `, el('b', '', t.correct ? 'Right' : 'Not yet'), ` · ${new Date(t.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`);
      return li;
    }) : [el('li', 'empty', local ? 'No answers checked yet.' : 'Checked answers show up here when the tutor is running.')]));
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
        body.innerHTML = entry.hints[step]; // our own checked content from help.json
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

  // The question's own text, without the key, help or answer box, for the tutor.
  function questionText(host) {
    const copy = host.cloneNode(true);
    copy.querySelectorAll('.ans, .help, .helpbtn, .answer').forEach((x) => x.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  function answerBox(id, host, big) {
    const box = el('form', 'answer');
    const input = el(big ? 'textarea' : 'input');
    if (big) input.rows = 3;
    input.maxLength = 500;
    input.placeholder = 'Your answer';
    input.setAttribute('aria-label', `Your answer to ${id}`);
    const r0 = progress[id];
    input.value = r0?.answer || '';
    if (r0?.status === 'right' || r0?.status === 'wrong') box.classList.add(r0.status);
    const result = el('div', 'answer-result');
    result.setAttribute('aria-live', 'polite');
    input.addEventListener('input', () => {
      const r = rec(id);
      r.answer = input.value;
      r.status = input.value.trim() ? 'answered' : '';
      save(); render();
      box.classList.remove('right', 'wrong');
      result.textContent = '';
    });
    box.append(input);
    if (!local) { box.addEventListener('submit', (e) => e.preventDefault()); return box; }
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
        const r = await post('/api/check', { page, id, question: questionText(host), answer });
        if (!r.ok) throw new Error();
        const { correct, feedback } = await r.json();
        const p = rec(id);
        p.status = correct ? 'right' : 'wrong';
        p.tries.push({ answer, correct, t: Date.now() });
        save(); render();
        box.classList.add(correct ? 'right' : 'wrong');
        result.textContent = '';
        result.append(el('b', '', correct ? 'Right! ' : 'Not yet. '), feedback);
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
