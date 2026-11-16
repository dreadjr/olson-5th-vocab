// A freshly generated practice form for one block (math/gen/?block=4&seed=12345&lessons=4.1,4.3): problems from the
// Practice templates (math/practice.js) for that block's lessons, answers computed by the calculator engine, each with
// Check, Hint, Step by step and Watch it. The seed is the form's number: the same seed gives the same form, so it can be
// printed or redone. Answers given are kept in this browser per form.
(() => {
  const TOPICS = { 1: 'Ratios and Rates', 2: 'Proportions and Similarity', 3: 'Percents', 4: 'Probability and Random Sampling', 5: 'Direct Variation', rne: 'Rational Numbers and Equations' };
  const groupOf = (lesson) => (lesson.startsWith('RNE') ? 'rne' : lesson.split('.')[0]); // RNE: the class's earlier unit, its own book
  let N = 12;
  // Reviews modeled on the class's exit quizzes (math/quizzes.js): ?quiz=<id> is one quiz twice (new numbers each
  // round), ?test=<block> is every exit quiz of a block in order, like a block test.
  const QR = globalThis.QuizReviews || [];
  const P = globalThis.Practice;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const params = new URLSearchParams(location.search);
  const quiz = QR.find((q) => q.id === params.get('quiz'));
  const test = !quiz && params.get('test') ? params.get('test') : null;
  const plan = quiz ? [...quiz.items, ...quiz.items] : test ? QR.filter((q) => q.group === test).flatMap((q) => q.items) : null;
  if (plan) N = plan.length;
  const block = quiz ? quiz.group : test ? test : params.get('block') === 'rne' ? 'rne' : String(parseInt(params.get('block'), 10) || 4);
  const byLesson = {};
  for (const [kind, v] of Object.entries(P.kinds)) if (groupOf(v.lesson) === block) (byLesson[v.lesson] ||= []).push(kind);
  const allLessons = Object.keys(byLesson).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  let seed = parseInt(params.get('seed'), 10) || 10000 + Math.floor(Math.random() * 90000);
  let lessons = (params.get('lessons') || '').split(',').filter((l) => byLesson[l]);
  if (!lessons.length) lessons = allLessons;

  // "3/10" shown stacked, like the printed tests.
  function stack(text) {
    const frag = document.createDocumentFragment();
    text.split(/(?<![\d.])(\d+(?:\.\d+)?\/\d+(?:\.\d+)?)(?![\d.]*\d)/).forEach((part, i) => {
      if (i % 2 === 0) { frag.append(part); return; }
      const [a, b] = part.split('/');
      const f = el('span', 'f');
      f.setAttribute('aria-label', `${a} over ${b}`);
      f.append(el('span', '', a), el('span', '', b));
      frag.append(f);
    });
    return frag;
  }

  /** The form's problems: every chosen skill at least once, then round-robin, in an order fixed by the seed. */
  function problems() {
    if (plan) return plan.map(([kind, variant], k) => P.make(kind, seed * 100 + k, variant));
    const kinds = lessons.flatMap((l) => byLesson[l]);
    let s = seed;
    const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    const order = kinds.map((k) => [rnd(), k]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    return Array.from({ length: N }, (_, k) => P.make(order[k % order.length], seed * 100 + k));
  }

  const KEY = () => `gen:${quiz ? `quiz:${quiz.id}` : test ? `test:${test}` : block}:${seed}:${lessons.join(',')}`;
  let saved = {};
  const load = () => { try { saved = JSON.parse(localStorage.getItem(KEY())) || {}; } catch { saved = {}; } };
  const store = () => { try { localStorage.setItem(KEY(), JSON.stringify(saved)); } catch { /* storage blocked */ } };
  const score = el('span', 'gen-score');
  const showScore = () => { const v = Object.values(saved); score.textContent = `${v.filter((x) => x.ok).length} of ${N} right · ${v.filter((x) => x.ok === false).length} to fix`; };

  function problemEl(p, k) {
    const q = el('div', 'gen-q');
    const body = el('div');
    q.append(el('span', 'n', `${k + 1}.`), body);
    const meta = el('div', 'q-meta');
    meta.append(el('span', 'lesson-chip', `Lesson ${P.kinds[p.kind].lesson}`), el('span', 'lesson-chip', P.kinds[p.kind].label));
    const text = el('div');
    text.append(stack(p.q));
    const form = el('form', 'answer');
    const input = el('input');
    input.autocomplete = 'off';
    input.placeholder = p.choice ? 'yes or no' : 'Your answer';
    input.setAttribute('aria-label', `Your answer to ${k + 1}`);
    input.value = saved[k]?.a || '';
    const check = el('button', '', 'Check');
    check.type = 'submit';
    const result = el('div', 'answer-result');
    result.setAttribute('aria-live', 'polite');
    form.append(input);
    if (p.choice) for (const yn of ['yes', 'no']) { const b = el('button', 'practice-yn', yn[0].toUpperCase() + yn.slice(1)); b.type = 'button'; b.addEventListener('click', () => { input.value = yn; form.requestSubmit(); }); form.append(b); }
    form.append(check, result);
    const show = (ok) => { form.classList.toggle('right', ok); form.classList.toggle('wrong', !ok); result.replaceChildren(el('b', '', ok ? '✓ Right! ' : '✗ Not yet. '), ok ? '' : 'Try again, or use Hint or Step by step.'); };
    if (saved[k]?.ok != null) show(saved[k].ok);
    input.addEventListener('input', () => { form.classList.remove('right', 'wrong'); result.textContent = ''; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ok = P.check(p, input.value);
      if (ok == null) { result.textContent = p.choice ? 'Answer yes or no.' : 'I can’t read that as a number yet. Try something like 3/10, 0.3, (2, −5) or y = 3x.'; return; }
      saved[k] = { a: input.value, ok };
      store(); showScore(); show(ok);
    });
    const tools = el('div', 'gen-tools');
    const extra = el('div');
    const hint = el('button', 'q-tool', 'Hint'), steps = el('button', 'q-tool', 'Step by step'), watch = el('button', 'q-tool', 'Watch it');
    for (const b of [hint, steps, watch]) b.type = 'button';
    hint.addEventListener('click', () => { const h = el('p', 'step-help'); h.append(stack(p.hint)); extra.replaceChildren(h); });
    let shown = 0;
    steps.addEventListener('click', () => {
      if (!extra.querySelector('.gen-steps')) { shown = 0; extra.replaceChildren(el('ol', 'gen-steps')); }
      const ol = extra.querySelector('.gen-steps');
      if (shown < p.steps.length) { const li = el('li'); li.append(stack(p.steps[shown++])); ol.append(li); }
      steps.textContent = shown < p.steps.length ? 'Next step' : 'All steps shown';
    });
    watch.addEventListener('click', () => globalThis.Board?.play({ title: `Watch it: ${P.kinds[p.kind].label}`, question: p.q, steps: p.steps }));
    tools.append(hint, steps, watch);
    body.append(meta, text, form, tools, extra);
    return q;
  }

  function render() {
    load();
    const ps = problems();
    const where = block === 'rne' ? 'Rational Numbers' : `Block ${block}`;
    const name = quiz ? `Review: ${quiz.title} · Form ${seed}` : test ? `${where} test review · Form ${seed}` : `${where} Practice · Form ${seed}`;
    document.title = name;
    document.getElementById('formName').textContent = `Form ${seed}`;
    document.getElementById('formTag').textContent = `Form ${seed}`;
    document.getElementById('title').textContent = quiz ? `Review: ${quiz.title}` : test ? `${block === 'rne' ? 'Rational Numbers & Equations' : `Block ${block}`} test review ~ every exit quiz` : `${block === 'rne' ? 'Rational Numbers & Equations' : `Block ${block}`} Practice ~ ${TOPICS[block] || ''}${lessons.length < allLessons.length ? ` (Lessons ${lessons.join(', ')})` : ''}`;
    const els = ps.map(problemEl);
    if (quiz) els.splice(quiz.items.length, 0, Object.assign(el('h2', 'gen-round', 'Round 2: the same kinds of questions, new numbers'), {}));
    if (test) { let k = 0; for (const q of QR.filter((x) => x.group === test)) { els.splice(k, 0, el('h2', 'gen-round', q.title)); k += q.items.length + 1; } }
    if (quiz) els.unshift(el('h2', 'gen-round', 'Round 1: like the exit quiz'));
    document.getElementById('qs').replaceChildren(...els);
    const key = document.getElementById('key');
    const ol = el('ol');
    for (const p of ps) { const li = el('li'); li.append(stack(p.word ? `${p.word} ${p.answer}` : p.answer ?? p.choice)); ol.append(li); }
    key.replaceChildren(el('h2', '', `Answer key · Form ${seed}`), ol);
    showScore();
    history.replaceState(null, '', quiz ? `?quiz=${quiz.id}&seed=${seed}` : test ? `?test=${test}&seed=${seed}` : `?block=${block}&seed=${seed}${lessons.length < allLessons.length ? `&lessons=${lessons.join(',')}` : ''}`);
  }

  const bar = document.getElementById('bar');
  const pick = el('span');
  pick.append('Lessons: ');
  for (const l of allLessons) {
    const lab = el('label');
    const cb = Object.assign(el('input'), { type: 'checkbox', checked: lessons.includes(l), value: l });
    cb.addEventListener('change', () => {
      const on = [...pick.querySelectorAll('input:checked')].map((x) => x.value);
      if (!on.length) { cb.checked = true; return; } // at least one lesson
      lessons = on;
      render();
    });
    lab.append(cb, l);
    pick.append(lab);
  }
  const again = el('button', '', 'New form');
  again.type = 'button';
  again.addEventListener('click', () => { seed = 10000 + Math.floor(Math.random() * 90000); render(); window.scrollTo(0, 0); });
  if (plan) pick.hidden = true; // a review has a fixed set of questions
  bar.append(pick, again, score);
  document.getElementById('print').addEventListener('click', () => window.print());
  if (!allLessons.length) { document.getElementById('qs').textContent = `No practice templates for Block ${block} yet.`; return; }
  render();
})();
