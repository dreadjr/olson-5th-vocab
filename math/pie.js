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

  // opts.draw: "draw the pie" for a question: the slices start equal (or at opts.start) and only degrees are shown,
  // so the student sets each one from their own work; opts.onChange(counts) after every move. wrap.counts() reads them.
  function make(data, opts = {}) {
    const T0 = data.reduce((s, [, n]) => s + n, 0), k = data.length;
    const even = data.map((_, i) => Math.floor(T0 / k) + (i < T0 % k ? 1 : 0));
    const start = data.map(([label, n], i) => [label, opts.draw ? opts.start?.[i] ?? even[i] : n]);
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
      opts.onChange?.(rows.map((r) => r.n));
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
      if (opts.draw) {
        head.append(el('th', '', ''), el('th', '', 'Fraction of circle'), el('th', '', 'Degrees'));
        legend.replaceChildren(head, ...rows.map((r, i) => {
          const tr = el('tr'), sw = el('td'), dot = el('span', 'pie-swatch');
          dot.style.background = COLORS[i % COLORS.length];
          sw.append(dot, r.label);
          tr.append(sw, el('td', '', `${r.n}/${T}`), el('td', 'pie-d', `${fmt(deg(r.n, T))}°`));
          return tr;
        }));
        return;
      }
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
    if (opts.draw) reset.textContent = 'Start over';
    reset.addEventListener('click', () => { rows = (opts.draw ? data.map(([label], i) => [label, even[i]]) : start).map(([label, n]) => ({ label, n })); draw(); });
    tools.append(el('span', 'pie-tip', 'Drag a white dot (or use the arrow keys on it) to move an edge.'), reset);
    const row = el('div', 'pie-row');
    const scroll = el('div', 'pie-scroll');
    scroll.append(legend);
    row.append(svg, scroll);
    wrap.append(row, explain, tools);
    wrap.counts = () => rows.map((r) => r.n);
    draw();
    return wrap;
  }

  globalThis.Pie = { make, deg, countAt };
})();
