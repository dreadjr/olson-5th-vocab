// Help panel for review forms: three hints in order (nudge, similar example, this problem) plus lesson links.
// Reads ./help.json and ../lessons.json; does nothing on pages without them. When the local tutor
// (bun run tutor) is serving the page, an Ask box sends questions to /api/ask.
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

  // Question ids: same rule as scripts/help-check.mjs questionIds().
  document.querySelectorAll('section.part').forEach((part, i) => {
    part.querySelectorAll('.q, .task').forEach((q) => {
      const n = q.querySelector(':scope > .n');
      const id = q.classList.contains('task') ? ROMAN[i] : n && `${ROMAN[i]}-${parseInt(n.textContent, 10)}`;
      const entry = id && help.entries?.[id];
      if (entry) attach(q.classList.contains('task') ? q : q.lastElementChild, id, entry);
    });
  });

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
      const copy = host.cloneNode(true);
      copy.querySelectorAll('.ans, .help, .helpbtn').forEach((x) => x.remove());
      send.disabled = true;
      reply.textContent = '…';
      try {
        const r = await post('/api/ask', { page, id, step: getStep(), question: copy.textContent.replace(/\s+/g, ' ').trim(), message });
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
