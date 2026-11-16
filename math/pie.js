// A pie chart you can reshape: drag the edge between two slices (or use the arrow keys on it) and see each slice's
// count, fraction, percent and degrees change. Slices snap to whole counts, so dragging keeps the total; typing a
// count changes the total. Pie.make(data) -> element, data = [["Sports", 18], ["Video games", 15], …]. Used by help.js.
(() => {
  const COLORS = ['#3b82f6', '#f76b15', '#30a46c', '#e5484d', '#8e4ec6', '#f5c518'];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const deg = (count, total) => (total ? (count / total) * 360 : 0);
  const fmt = (x) => (Number.isInteger(x) ? String(x) : `≈ ${x.toFixed(1)}`);
  // The count a boundary at this angle stands for (angle in degrees from the top, clockwise).
  const countAt = (angle, total) => Math.round((((angle % 360) + 360) % 360) / 360 * total);

  function make(data) {
    const start = data.map(([label, n]) => [label, n]);
    let rows = start.map(([label, n]) => ({ label, n }));
    const wrap = el('div', 'pie');
    const R = 90, C = 110;
    const svg = svgEl('svg', { viewBox: '0 0 220 220', width: 220, height: 220, role: 'img' });
    const legend = el('table', 'pie-legend');
    const total = () => rows.reduce((s, r) => s + r.n, 0);
    const pt = (a, r = R) => [C + r * Math.sin((a * Math.PI) / 180), C - r * Math.cos((a * Math.PI) / 180)];
    let handles = [], dragging = null, focus = 0;
    // From probability to degrees, worked for the slice last moved: "Bus: 12/30 of the circle · 360° = 144°".
    const explain = el('p', 'pie-explain');
    explain.setAttribute('aria-live', 'polite');
    // Dragging is handled on the chart, which stays while the slices and dots are redrawn.
    svg.addEventListener('pointermove', (e) => {
      if (dragging == null) return;
      const box = svg.getBoundingClientRect(), x = ((e.clientX - box.left) / box.width) * 220 - C, y = ((e.clientY - box.top) / box.height) * 220 - C;
      moveEdge(dragging, countAt((Math.atan2(x, -y) * 180) / Math.PI, total()));
    });
    for (const ev of ['pointerup', 'pointercancel']) svg.addEventListener(ev, () => { dragging = null; });

    function draw() {
      const T = total();
      svg.replaceChildren();
      let a = 0;
      rows.forEach((r, i) => {
        const d = deg(r.n, T), b = a + d, [x1, y1] = pt(a), [x2, y2] = pt(b);
        const shape = d >= 359.999 ? svgEl('circle', { cx: C, cy: C, r: R }) : svgEl('path', { d: `M${C},${C} L${x1},${y1} A${R},${R} 0 ${d > 180 ? 1 : 0} 1 ${x2},${y2} Z` });
        shape.setAttribute('fill', COLORS[i % COLORS.length]);
        shape.setAttribute('stroke', '#fff');
        shape.setAttribute('stroke-width', '1.5');
        if (d > 0) svg.append(shape);
        if (d >= 24) { const [tx, ty] = pt(a + d / 2, R * 0.62); const t = svgEl('text', { x: tx, y: ty, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'pie-deg' }); t.textContent = `${fmt(d)}°`; svg.append(t); }
        a = b;
      });
      // A handle on each edge between two slices (the first edge, at the top, stays put).
      handles = [];
      let cum = 0;
      rows.slice(0, -1).forEach((r, i) => {
        cum += r.n;
        const at = cum; // this edge's own running count (cum keeps changing in the loop)
        const [hx, hy] = pt(deg(at, T));
        const h = svgEl('circle', { cx: hx, cy: hy, r: 9, class: 'pie-handle', tabindex: 0, role: 'slider',
          'aria-label': `Edge between ${r.label} and ${rows[i + 1].label}`, 'aria-valuemin': 0, 'aria-valuemax': T, 'aria-valuenow': at,
          'aria-valuetext': `${r.label} ${r.n}, ${rows[i + 1].label} ${rows[i + 1].n}` });
        h.addEventListener('pointerdown', (e) => { e.preventDefault(); dragging = i; svg.setPointerCapture(e.pointerId); });
        h.addEventListener('keydown', (e) => {
          const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
          if (!step) return;
          e.preventDefault();
          moveEdge(i, at + step);
          handles[i]?.focus();
        });
        svg.append(h);
        handles.push(h);
      });
      svg.setAttribute('aria-label', `Pie chart: ${rows.map((r) => `${r.label} ${r.n}, ${fmt(deg(r.n, T))} degrees`).join('; ')}`);
      table(T);
      const r = rows[focus], g = r.n ? gcd(r.n, T) : 1;
      explain.replaceChildren(el('b', '', `${r.label}: `), `P = ${r.n}/${T}${g > 1 ? ` = ${r.n / g}/${T / g}` : ''}, so it gets ${r.n}/${T} of the circle. ${r.n}/${T} · 360° = ${fmt(deg(r.n, T))}°.`);
    }

    // Edge i sits after slice i: moving it to running count c moves counts between slice i and slice i+1 only.
    function moveEdge(i, c) {
      const before = rows.slice(0, i).reduce((s, r) => s + r.n, 0), pair = rows[i].n + rows[i + 1].n;
      const n = Math.max(0, Math.min(pair, c - before));
      if (n === rows[i].n) return;
      focus = i;
      rows[i].n = n;
      rows[i + 1].n = pair - n;
      const keep = handles[i] && document.activeElement === handles[i];
      draw();
      if (keep) handles[i].focus();
    }

    function table(T) {
      const head = el('tr');
      for (const t of ['', 'Count', 'Probability', '· 360° =', 'Percent']) head.append(el('th', '', t));
      const body = rows.map((r, i) => {
        const tr = el('tr');
        const sw = el('td');
        const dot = el('span', 'pie-swatch');
        dot.style.background = COLORS[i % COLORS.length];
        sw.append(dot, r.label);
        const cnt = el('td');
        const input = Object.assign(el('input'), { type: 'number', min: 0, value: r.n, inputMode: 'numeric' });
        input.setAttribute('aria-label', `${r.label} count`);
        input.addEventListener('change', () => { r.n = Math.max(0, Math.round(+input.value || 0)); focus = i; draw(); });
        cnt.append(input);
        const g = r.n ? gcd(r.n, T) : 1;
        tr.append(sw, cnt, el('td', '', T ? `${r.n}/${T}${g > 1 ? ` = ${r.n / g}/${T / g}` : ''}` : '–'), el('td', 'pie-d', `${fmt(deg(r.n, T))}°`),
          el('td', '', T ? `${fmt((r.n / T) * 100)}%` : '–'));
        return tr;
      });
      const foot = el('tr', 'pie-total');
      foot.append(el('td', '', 'Total'), el('td', '', String(T)), el('td', '', T ? `${T}/${T}` : '–'), el('td', 'pie-d', T ? '360°' : '0°'), el('td', '', T ? '100%' : '–'));
      legend.replaceChildren(head, ...body, foot);
    }

    const tools = el('div', 'pie-tools');
    const reset = el('button', 'q-tool', 'Reset to the data');
    reset.type = 'button';
    reset.addEventListener('click', () => { rows = start.map(([label, n]) => ({ label, n })); draw(); });
    tools.append(el('span', 'pie-tip', 'Drag a white dot (or use the arrow keys on it) to move an edge.'), reset);
    const row = el('div', 'pie-row');
    const scroll = el('div', 'pie-scroll');
    scroll.append(legend);
    row.append(svg, scroll);
    wrap.append(row, explain, tools);
    draw();
    return wrap;
  }

  // ---- Freehand: draw the pie like on paper. Tap or drag on the circle to draw a line from the center (no snapping;
  // each slice shows its angle, like reading a protractor), tap a slice to label it, then grade() says which slices
  // are close enough (within tol degrees) without giving the right size away.
  const norm = (a) => ((a % 360) + 360) % 360;
  /** Slices from line angles: [{ id, from, size }] going clockwise; a slice is named by the line it starts at. */
  function slices(lines) {
    const ls = [...lines].sort((a, b) => a.a - b.a);
    return ls.map((l, k) => ({ id: l.id, from: l.a, size: ls.length < 2 ? 360 : norm(ls[(k + 1) % ls.length].a - l.a) || 360 }));
  }
  /** Is each labeled slice close to its share of 360°? -> { ok, rows: [{ label, size, want, close, msg }] } */
  function grade(lines, labels, data, tol = 5) {
    const T = data.reduce((t, [, n]) => t + n, 0), sl = slices(lines);
    if (sl.length !== data.length) return { ok: false, msg: `Draw ${data.length} lines from the center to make ${data.length} sectors (you have ${sl.length < 2 ? 'no sectors yet' : `${sl.length}`}).` };
    const rows = data.map(([label, n]) => {
      const mine = sl.filter((x) => labels[x.id] === label), want = (n / T) * 360;
      if (mine.length !== 1) return { label, close: false, msg: mine.length ? `${label} is on more than one sector.` : `Label a sector ${label}.` };
      const size = Math.round(mine[0].size), off = size - want, close = Math.abs(off) <= tol;
      return { label, size, want, close, msg: close ? `${label}: ${size}°, close enough ✓` : `${label}: ${size}° is ${Math.abs(off) > 20 ? 'much ' : 'a bit '}too ${off > 0 ? 'big' : 'small'}.` };
    });
    return { ok: rows.every((r) => r.close), rows };
  }

  function freehand(data, opts = {}) {
    const wrap = el('div', 'pie pie-free');
    const R = 100, C = 120;
    const svg = svgEl('svg', { viewBox: '0 0 240 240', width: 240, height: 240, role: 'img' });
    let lines = (opts.start?.lines || []).map((l) => ({ ...l })), labels = { ...(opts.start?.labels || {}) }, nextId = Math.max(0, ...lines.map((l) => l.id)) + 1;
    let dragging = null, focus = null;
    const pt = (a, r = R) => [C + r * Math.sin((a * Math.PI) / 180), C - r * Math.cos((a * Math.PI) / 180)];
    const angleOf = (e) => { const b = svg.getBoundingClientRect(), x = ((e.clientX - b.left) / b.width) * 240 - C, y = ((e.clientY - b.top) / b.height) * 240 - C; return { a: Math.round(norm((Math.atan2(x, -y) * 180) / Math.PI)), d: Math.hypot(x, y) }; };
    const names = data.map(([label]) => label);
    const tip = el('p', 'pie-explain');
    tip.setAttribute('aria-live', 'polite');

    function draw() {
      svg.replaceChildren(svgEl('circle', { cx: C, cy: C, r: R, class: 'free-circle' }));
      const sl = slices(lines);
      if (lines.length > 1) sl.forEach((x) => {
        const label = labels[x.id], i = names.indexOf(label);
        const [x1, y1] = pt(x.from), [x2, y2] = pt(x.from + x.size);
        const p = svgEl('path', { d: `M${C},${C} L${x1},${y1} A${R},${R} 0 ${x.size > 180 ? 1 : 0} 1 ${x2},${y2} Z`, class: 'free-slice', fill: i >= 0 ? COLORS[i % COLORS.length] : 'transparent' });
        p.addEventListener('pointerdown', (e) => {
          if (dragging != null || (lines.length < data.length && angleOf(e).d >= R * 0.55)) return; // near the edge: still drawing lines
          e.stopPropagation();
          cycle(x.id);
        });
        svg.append(p);
        const [tx, ty] = pt(x.from + x.size / 2, R * 0.6);
        const t = svgEl('text', { x: tx, y: ty, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'free-label' });
        t.textContent = `${label ? `${x.size < 45 ? label.slice(0, 4) : label} ` : ''}${Math.round(x.size)}°`; // Bus and Bike both start with B
        svg.append(t);
      });
      for (const l of lines) {
        const [x, y] = pt(l.a);
        svg.append(svgEl('line', { x1: C, y1: C, x2: x, y2: y, class: 'free-line' }));
        const h = svgEl('circle', { cx: x, cy: y, r: 9, class: 'pie-handle', tabindex: 0, role: 'slider', 'aria-label': `Line at ${l.a} degrees`, 'aria-valuemin': 0, 'aria-valuemax': 359, 'aria-valuenow': l.a });
        h.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); dragging = l.id; svg.setPointerCapture(e.pointerId); });
        h.addEventListener('keydown', (e) => {
          const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
          if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); lines = lines.filter((m) => m !== l); changed(); return; }
          if (!step) return;
          e.preventDefault(); l.a = norm(l.a + step * (e.shiftKey ? 10 : 1)); focus = l.id; changed();
        });
        svg.append(h);
      }
      svg.append(svgEl('circle', { cx: C, cy: C, r: 2.5, class: 'free-center' }));
      if (focus != null) [...svg.querySelectorAll('.pie-handle')][lines.findIndex((l) => l.id === focus)]?.focus();
      const need = data.length - lines.length;
      tip.textContent = need > 0 ? `Tap near the edge of the circle to draw a line from the center (${need} more to go). Drag a white dot to move a line. Tap the middle of a sector to label it.`
        : 'Tap a sector to label it (tap again for the next label). Each sector shows its angle.';
      svg.setAttribute('aria-label', `Your pie: ${lines.length} lines. ${sl.length > 1 ? sl.map((x) => `${labels[x.id] || 'unlabeled'} ${Math.round(x.size)} degrees`).join(', ') : ''}`);
    }
    const changed = () => { draw(); opts.onChange?.(state()); };
    const state = () => ({ lines: lines.map((l) => ({ id: l.id, a: l.a })), labels: { ...labels } });
    // Tapping a sector gives it the next label no other sector has yet; past the last one it goes back to unlabeled.
    function cycle(id) {
      const taken = new Set(Object.entries(labels).filter(([other]) => +other !== id).map(([, lab]) => lab));
      const next = names.slice(names.indexOf(labels[id]) + 1).find((n) => !taken.has(n));
      if (next) labels[id] = next; else delete labels[id];
      changed();
    }
    svg.addEventListener('pointerdown', (e) => {
      const { a, d } = angleOf(e);
      if (d < R * 0.55 || d > R * 1.25 || lines.length >= data.length) return; // a new line starts near the edge
      const l = { id: nextId++, a };
      lines.push(l);
      dragging = l.id;
      svg.setPointerCapture(e.pointerId);
      changed();
    });
    svg.addEventListener('pointermove', (e) => { if (dragging == null) return; const l = lines.find((m) => m.id === dragging); if (l) { l.a = angleOf(e).a; draw(); } });
    for (const ev of ['pointerup', 'pointercancel']) svg.addEventListener(ev, () => { if (dragging != null) { dragging = null; changed(); } });

    const tools = el('div', 'pie-tools');
    const undo = el('button', 'q-tool', 'Remove last line'), clear = el('button', 'q-tool', 'Start over');
    for (const b of [undo, clear]) b.type = 'button';
    undo.addEventListener('click', () => { const l = lines.pop(); if (l) delete labels[l.id]; changed(); });
    clear.addEventListener('click', () => { lines = []; labels = {}; changed(); });
    tools.append(undo, clear);
    wrap.append(svg, tip, tools);
    wrap.state = state;
    wrap.grade = (tol) => grade(lines, labels, data, tol);
    draw();
    return wrap;
  }

  globalThis.Pie = { make, deg, countAt, freehand, grade, slices };
})();
