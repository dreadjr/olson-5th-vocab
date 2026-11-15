// Numi-style calculator for the review forms: one calculation per line, answers to the right.
// Exact fractions (9/36 = 1/4), statistics (mean, median, mad, q1, q3…), percents ("20% of 80",
// "3/4 as %"), named values ("p = 45/150") and "ans" for the line before. No dependencies.
// The engine (globalThis.Calc) is plain JS so scripts/calc.test.mjs can run it in node.
(() => {
  // ---- numbers: exact rationals {n, d} (BigInt) or floats {f} when exactness is lost (sqrt, decimals powers…)
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const Q = (n, d = 1n) => {
    if (d === 0n) throw new Error('can’t divide by 0');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d) || 1n;
    return { n: n / g, d: d / g };
  };
  const F = (x) => { if (!Number.isFinite(x)) throw new Error('that number is too big'); return { f: x }; };
  const isQ = (v) => 'n' in v;
  const num = (v) => (isQ(v) ? Number(v.n) / Number(v.d) : v.f);
  const fromDec = (s) => { const [i, fr = ''] = s.split('.'); return Q(BigInt((i + fr) || '0'), 10n ** BigInt(fr.length)); };
  const add = (a, b) => (isQ(a) && isQ(b) ? Q(a.n * b.d + b.n * a.d, a.d * b.d) : F(num(a) + num(b)));
  const neg = (a) => (isQ(a) ? Q(-a.n, a.d) : F(-a.f));
  const sub = (a, b) => add(a, neg(b));
  const mul = (a, b) => (isQ(a) && isQ(b) ? Q(a.n * b.n, a.d * b.d) : F(num(a) * num(b)));
  const div = (a, b) => {
    if (num(b) === 0) throw new Error('can’t divide by 0');
    return isQ(a) && isQ(b) ? Q(a.n * b.d, a.d * b.n) : F(num(a) / num(b));
  };
  const absv = (a) => (isQ(a) ? Q(a.n < 0n ? -a.n : a.n, a.d) : F(Math.abs(a.f)));
  const pow = (a, b) => {
    if (isQ(a) && isQ(b) && b.d === 1n) {
      const e = b.n < 0n ? -b.n : b.n;
      if (e <= 64n) { const r = Q(a.n ** e, a.d ** e); return b.n < 0n ? div(Q(1n), r) : r; }
    }
    return F(num(a) ** num(b));
  };
  const isqrt = (n) => { const r = BigInt(Math.round(Math.sqrt(Number(n)))); return r * r === n ? r : null; };
  const sqrt = (a) => {
    if (num(a) < 0) throw new Error('no square root of a negative number');
    if (isQ(a)) { const n = isqrt(a.n), d = isqrt(a.d); if (n !== null && d !== null) return Q(n, d); }
    return F(Math.sqrt(num(a)));
  };

  // ---- statistics (quartiles: median of each half, leaving out the middle value when the count is odd)
  const need = (xs) => { if (!xs.length) throw new Error('needs some numbers'); return xs; };
  const sorted = (xs) => [...need(xs)].sort((a, b) => num(a) - num(b));
  const sum = (xs) => xs.reduce(add, Q(0n));
  const mean = (xs) => div(sum(need(xs)), Q(BigInt(xs.length)));
  const median = (xs) => { const s = sorted(xs), m = s.length >> 1; return s.length % 2 ? s[m] : div(add(s[m - 1], s[m]), Q(2n)); };
  const half = (xs, upper) => { const s = sorted(xs), m = s.length >> 1; return upper ? s.slice(s.length % 2 ? m + 1 : m) : s.slice(0, m); };
  const LIST = {
    sum: (xs) => sum(need(xs)), mean, average: mean, avg: mean, median,
    min: (xs) => sorted(xs)[0], max: (xs) => sorted(xs).at(-1),
    range: (xs) => sub(sorted(xs).at(-1), sorted(xs)[0]),
    mad: (xs) => { const m = mean(xs); return mean(xs.map((x) => absv(sub(x, m)))); },
    q1: (xs) => median(half(xs, false)), q3: (xs) => median(half(xs, true)),
    iqr: (xs) => sub(median(half(xs, true)), median(half(xs, false))),
    count: (xs) => Q(BigInt(xs.length)),
  };
  const ONE = {
    abs: absv, sqrt,
    round: (x, d) => fromDec(num(x).toFixed(d ? Math.max(0, Math.min(10, Math.round(num(d)))) : 0)),
  };
  const RESERVED = new Set(['of', 'as', 'ans', 'pi']);

  // ---- parsing: + - * / ^ ( ) %, "of", implicit times (2(3+4), 3p), "x" as times between numbers
  function tokenize(s) {
    const re = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([A-Za-z_][A-Za-z_0-9]*)|(\*\*|[-+*/^()%,=×÷·−]))/y;
    const out = [];
    s = s.trimEnd();
    for (let i = 0; i < s.length;) {
      re.lastIndex = i;
      const m = re.exec(s);
      if (!m) throw new Error(`I don’t know “${s.slice(i).trim()[0]}”`);
      i = re.lastIndex;
      if (m[1]) out.push({ t: 'num', v: m[1] });
      else if (m[2]) out.push({ t: 'id', v: m[2].toLowerCase() });
      else out.push({ t: 'op', v: { '×': '*', '·': '*', '÷': '/', '−': '-', '**': '^' }[m[3]] || m[3] });
    }
    return out;
  }

  function parse(toks, env) {
    let p = 0, implicit = true;
    const peek = (k = 0) => toks[p + k];
    const isOp = (v) => peek()?.t === 'op' && peek().v === v;
    const isId = (v) => peek()?.t === 'id' && peek().v === v;
    const expect = (v) => { if (!isOp(v)) throw new Error(`missing “${v}”`); p++; };
    const expr = () => {
      let a = term();
      for (;;) {
        if (isOp('+')) { p++; a = add(a, term()); } else if (isOp('-')) { p++; a = sub(a, term()); } else return a;
      }
    };
    const term = () => {
      let a = unary();
      for (;;) {
        if (isOp('*')) { p++; a = mul(a, unary()); }
        else if (isOp('/')) { p++; a = div(a, unary()); }
        else if (isId('of')) { p++; a = mul(a, unary()); }
        else if (isId('x') && !('x' in env) && (peek(1)?.t === 'num' || peek(1)?.v === '(')) { p++; a = mul(a, unary()); }
        else if (implicit && peek() && (isOp('(') || (peek().t === 'id' && !RESERVED.has(peek().v)))) a = mul(a, unary());
        else return a;
      }
    };
    const unary = () => {
      if (isOp('-')) { p++; return neg(unary()); }
      if (isOp('+')) { p++; return unary(); }
      const a = postfix();
      if (isOp('^')) { p++; return pow(a, unary()); }
      return a;
    };
    const postfix = () => { let a = primary(); while (isOp('%')) { p++; a = div(a, Q(100n)); } return a; };
    const primary = () => {
      const t = peek();
      if (!t) throw new Error('unfinished');
      if (t.t === 'num') { p++; return fromDec(t.v); }
      if (isOp('(')) { p++; const was = implicit; implicit = true; const v = expr(); implicit = was; expect(')'); return v; }
      if (t.t === 'id') {
        p++;
        if ((LIST[t.v] || ONE[t.v]) && isOp('(')) {
          p++;
          const was = implicit; implicit = false; // "mean(3 4 5)": spaces separate the numbers
          const args = [];
          while (!isOp(')')) {
            if (!peek()) throw new Error('missing “)”');
            if (isOp(',')) { p++; continue; }
            args.push(expr());
          }
          implicit = was; p++;
          if (LIST[t.v]) return LIST[t.v](args);
          if (!args.length) throw new Error(`${t.v}( ) needs a number`);
          return ONE[t.v](...args);
        }
        if (t.v === 'pi') return F(Math.PI);
        if (t.v in env) return env[t.v];
        throw new Error(t.v === 'ans' ? 'no answer above yet' : `“${t.v}” isn’t set; write ${t.v} = … first`);
      }
      throw new Error(`unexpected “${t.v}”`);
    };
    const v = expr();
    if (p < toks.length) throw new Error(`unexpected “${toks[p].v}”`);
    return v;
  }

  // ---- formatting: whole numbers, fractions with their decimal, or decimals
  const dec = (x) => String(Number(x.toPrecision(10)));
  const terminates = (d) => { while (d % 2n === 0n) d /= 2n; while (d % 5n === 0n) d /= 5n; return d === 1n; };
  function format(v, as) {
    const x = num(v);
    if (as === '%') {
      return { text: `${isQ(v) && terminates(v.d) ? '' : '≈ '}${dec(x * 100)}%` };
    }
    if (!isQ(v) || as === 'decimal') return { text: (isQ(v) && !terminates(v.d) ? '≈ ' : '') + dec(x) };
    if (v.d === 1n) return { text: v.n.toString() };
    return { text: `${v.n}/${v.d}`, hint: `${terminates(v.d) ? '=' : '≈'} ${dec(x)}` };
  }

  function evalLine(line, env) {
    let s = line.replace(/(#|\/\/).*$/, '').replace(/^\s*[A-Za-z][A-Za-z0-9 ]*:\s*/, ''); // comments and "label:"
    if (!s.trim()) return null;
    let toks = tokenize(s), as = null;
    const at = toks.findIndex((t) => t.t === 'id' && t.v === 'as');
    if (at >= 0) {
      const w = toks.slice(at + 1).map((t) => t.v).join(' ');
      as = { '%': '%', percent: '%', decimal: 'decimal', fraction: 'fraction' }[w];
      if (!as) throw new Error('try “as %”, “as decimal” or “as fraction”');
      toks = toks.slice(0, at);
    }
    let name = null;
    if (toks[0]?.t === 'id' && toks[1]?.t === 'op' && toks[1].v === '=') {
      name = toks[0].v;
      if (LIST[name] || ONE[name] || RESERVED.has(name)) throw new Error(`“${name}” is already a word I use`);
      toks = toks.slice(2);
    }
    const v = parse(toks, env);
    if (name) env[name] = v;
    env.ans = v;
    return format(v, as);
  }

  /** One result per line: {text, hint?} for a calculation, {error} for a broken one, {} for notes and blanks. */
  function evalLines(text) {
    const env = {};
    return text.split('\n').map((line) => {
      try { return evalLine(line, env) || {}; } catch (e) { return /\d/.test(line) ? { error: e.message } : {}; }
    });
  }
  globalThis.Calc = { evalLines };

  // ---- the panel on the form pages
  if (typeof document === 'undefined') return;
  const page = location.pathname.split('/').filter(Boolean).at(-1) || '';
  const KEY = `calc:${page}`;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

  const panel = el('aside', 'calc');
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Calculator');
  const head = el('div', 'calc-head');
  const close = el('button', 'calc-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close calculator');
  head.append(el('b', '', 'Calculator'), el('span', 'calc-tip', 'one per line · fractions stay exact'), close);
  const body = el('div', 'calc-body');
  const input = el('textarea', 'calc-in');
  input.wrap = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('aria-label', 'Calculations, one per line');
  input.placeholder = '9/36\n1/6 * 1/6 * 1/6\n20% of 80\n3/4 as %\np = 45/150\np * 1/3 * 900\nmedian(30 25 40 35 20 45)\nmad(2 8 15 22 28)';
  const out = el('div', 'calc-out');
  out.setAttribute('aria-label', 'Answers');
  body.append(input, out);
  const foot = el('div', 'calc-foot', 'mean  median  range  mad  q1  q3  iqr  min  max  sum  sqrt  round  ·  “of”  “as %”  ans');
  panel.append(head, body, foot);

  const render = () => {
    const rows = Calc.evalLines(input.value);
    out.replaceChildren(...rows.map((r) => {
      const row = el('div', `calc-row${r.error ? ' err' : ''}`);
      if (r.error) { row.textContent = r.error; row.title = r.error; return row; }
      if (!r.text) return row;
      const b = el('button', 'calc-val', r.text);
      b.type = 'button';
      b.title = 'Copy';
      b.addEventListener('click', () => { navigator.clipboard?.writeText(r.text.replace(/^≈ /, '')).then(() => { b.textContent = 'copied'; setTimeout(() => { b.textContent = r.text; }, 900); }, () => {}); });
      row.append(b);
      if (r.hint) row.append(el('span', 'calc-hint', r.hint));
      return row;
    }));
    out.scrollTop = input.scrollTop;
  };
  try { input.value = localStorage.getItem(KEY) || ''; } catch { /* storage blocked */ }
  input.addEventListener('input', () => { try { localStorage.setItem(KEY, input.value); } catch { /* storage blocked */ } render(); });
  input.addEventListener('scroll', () => { out.scrollTop = input.scrollTop; });

  const btn = el('button', 'calc-btn', 'Calculator');
  btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false');
  const set = (open) => {
    panel.hidden = !open;
    document.body.classList.toggle('calc-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (open) { render(); input.focus(); }
  };
  btn.addEventListener('click', () => set(panel.hidden));
  close.addEventListener('click', () => { set(false); btn.focus(); });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { set(false); btn.focus(); } });
  const toggle = document.getElementById('toggle');
  toggle ? toggle.before(btn) : document.querySelector('.toolbar')?.append(btn);
  document.body.append(panel);
})();
