// Generates math/b5-form-b and math/b5-form-c index.html. Graphs are computed, not hand-placed.
import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const OUT = '/Users/dreadjr/github/dreadjr/olson-5th-vocab/math';
const M = n => (n < 0 ? '−' + (-n) : String(n));            // typographic minus
const F = (a, b) => `<span class="f"><span>${a}</span><span>${b}</span></span>`;
const r2 = n => Math.round(n * 100) / 100;
const INK = 'style="fill:var(--ink)"';
const GRID = 'style="stroke:var(--rule);stroke-width:.5"';
const T = (x, y, s, o = '') => `<text x="${r2(x)}" y="${r2(y)}" style="font-size:${o.fs || 9}px"${o.a ? ` text-anchor="${o.a}"` : ''}${o.t ? ` transform="${o.t}"` : ''}>${s}</text>`;

function head(px, py, dx, dy, s = 6) {           // filled arrowhead at (px,py) pointing along (dx,dy)
  const L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const bx = px - ux * s, by = py - uy * s, w = s * 0.45;
  return `<polygon points="${r2(px)},${r2(py)} ${r2(bx - uy * w)},${r2(by + ux * w)} ${r2(bx + uy * w)},${r2(by - ux * w)}" ${INK}/>`;
}

// Coordinate plane. Data coords -> px. quad1: axes at left/bottom, labels from 1.
function plane(o) {
  const { xmin, xmax, ymin, ymax, u = 14, uy = u, gx = 1, gy = 1, lx = 1, ly = 1, quad1 = false } = o;
  const L = o.padL ?? 26, R = 14, Tp = 12, B = o.padB ?? 20;
  const W = L + (xmax - xmin) * u + R, H = Tp + (ymax - ymin) * uy + B;
  const X = x => L + (x - xmin) * u, Y = y => Tp + (ymax - y) * uy;
  let s = '';
  for (let x = xmin; x <= xmax + 1e-9; x += gx) s += `<line x1="${r2(X(x))}" y1="${Y(ymin)}" x2="${r2(X(x))}" y2="${Y(ymax)}" ${GRID}/>`;
  for (let y = ymin; y <= ymax + 1e-9; y += gy) s += `<line x1="${X(xmin)}" y1="${r2(Y(y))}" x2="${X(xmax)}" y2="${r2(Y(y))}" ${GRID}/>`;
  const ax = quad1 ? ymin : 0, ay = quad1 ? xmin : 0, ext = 9;
  // axes
  const x0 = quad1 ? X(xmin) : X(xmin) - ext, x1 = X(xmax) + ext, y0 = quad1 ? Y(ymin) : Y(ymin) + ext, y1 = Y(ymax) - ext;
  s += `<line class="ln" x1="${x0}" y1="${Y(ax)}" x2="${x1}" y2="${Y(ax)}"/>` + head(x1, Y(ax), 1, 0);
  s += `<line class="ln" x1="${X(ay)}" y1="${y0}" x2="${X(ay)}" y2="${y1}"/>` + head(X(ay), y1, 0, -1);
  if (!quad1) s += head(x0, Y(ax), -1, 0) + head(X(ay), y0, 0, 1);
  // tick labels
  for (let x = Math.ceil(xmin / lx) * lx; x <= xmax; x += lx) if (x !== 0 && !(o.skipX || []).includes(x))
    s += T(X(x), Y(ax) + 11, M(o.fx ? o.fx(x) : x), { a: 'middle' });
  for (let y = Math.ceil(ymin / ly) * ly; y <= ymax; y += ly) if (y !== 0 && !(o.skipY || []).includes(y))
    s += T(X(ay) - 3, Y(y) + 3, M(o.fy ? o.fy(y) : y), { a: 'end' });
  if (o.xt) s += T((X(xmin) + X(xmax)) / 2, H - 2, o.xt, { a: 'middle', fs: 10 });
  if (o.yt) s += T(10, (Y(ymin) + Y(ymax)) / 2, o.yt, { a: 'middle', fs: 10, t: `rotate(-90 10 ${r2((Y(ymin) + Y(ymax)) / 2)})` });
  // line y = m x (+ b) clipped to the grid, arrows on both ends (or from a start x)
  for (const ln of o.lines || []) {
    const f = x => ln.m * x + (ln.b || 0);
    let a = ln.from ?? xmin, b = xmax;
    // clip x so y stays in [ymin, ymax]
    const xa = (ymin - (ln.b || 0)) / ln.m, xb = (ymax - (ln.b || 0)) / ln.m;
    a = Math.max(a, Math.min(xa, xb)); b = Math.min(b, Math.max(xa, xb));
    const P = [X(a), Y(f(a))], Q = [X(b), Y(f(b))];
    s += `<line class="ln" style="stroke-width:1.8" x1="${r2(P[0])}" y1="${r2(P[1])}" x2="${r2(Q[0])}" y2="${r2(Q[1])}"/>` + head(Q[0], Q[1], Q[0] - P[0], Q[1] - P[1], 7);
    if (ln.from === undefined) s += head(P[0], P[1], P[0] - Q[0], P[1] - Q[1], 7);
  }
  for (const c of o.curves || []) {   // sampled function from a to b, arrow at end
    const pts = []; for (let i = 0; i <= 40; i++) { const x = c.a + (c.b - c.a) * i / 40; pts.push([X(x), Y(c.f(x))]); }
    s += `<polyline class="ln" style="stroke-width:1.8" points="${pts.map(p => p.map(r2).join(',')).join(' ')}"/>`;
    const [p, q] = pts.slice(-2); s += head(q[0], q[1], q[0] - p[0], q[1] - p[1], 7);
  }
  if (o.path) s += `<polyline class="ln" style="stroke-width:2" points="${o.path.map(([x, y]) => `${r2(X(x))},${r2(Y(y))}`).join(' ')}"/>`;
  for (const p of o.pts || []) {
    s += `<circle cx="${r2(X(p.x))}" cy="${r2(Y(p.y))}" r="3" ${INK}/>`;
    if (p.l) s += T(X(p.x) + (p.dx ?? 5), Y(p.y) + (p.dy ?? -5), p.l, { fs: p.fs || 11, a: p.a });
  }
  return `<svg viewBox="0 0 ${r2(W)} ${r2(H)}" width="${r2(W)}" role="img" aria-label="${o.label}">${s}</svg>`;
}

// Small sketch: axes crossing in the middle, data window [-3,3] x [-2,2]
function sketch(shape, label) {
  const X = x => 50 + x * 14, Y = y => 36 - y * 14;
  let s = `<line class="ln" x1="6" y1="36" x2="94" y2="36" style="stroke-width:1"/><line class="ln" x1="50" y1="4" x2="50" y2="68" style="stroke-width:1"/>`;
  const draw = (f, a, b, both = true) => {
    const pts = []; for (let i = 0; i <= 40; i++) { const x = a + (b - a) * i / 40; pts.push([X(x), Y(f(x))]); }
    s += `<polyline class="ln" style="stroke-width:1.6" points="${pts.map(p => p.map(r2).join(',')).join(' ')}"/>`;
    let [p, q] = pts.slice(-2); s += head(q[0], q[1], q[0] - p[0], q[1] - p[1], 6);
    if (both) { [q, p] = pts.slice(0, 2); s += head(q[0], q[1], q[0] - p[0], q[1] - p[1], 6); }
  };
  for (const [f, a, b] of shape) draw(f, a, b);
  return `<svg viewBox="0 0 100 72" width="100" role="img" aria-label="${label}">${s}</svg>`;
}

// Story graph sketch (Quadrant I only). path in [0,10] x [0,6]
function story(yTitle, path, label) {
  const X = x => 24 + x * 9.5, Y = y => 66 - y * 9.5;
  let s = `<line class="ln" x1="24" y1="4" x2="24" y2="66" style="stroke-width:1"/><line class="ln" x1="24" y1="66" x2="124" y2="66" style="stroke-width:1"/>`;
  s += `<polyline class="ln" style="stroke-width:1.8" points="${path.map(([x, y]) => `${r2(X(x))},${r2(Y(y))}`).join(' ')}"/>`;
  s += T(74, 78, 'Time', { a: 'middle', fs: 10 });
  const lines = yTitle.split('|');
  lines.forEach((t, i) => { const cx = 16 - (lines.length - 1 - i) * 10; s += T(cx, 35, t, { a: 'middle', fs: 9.5, t: `rotate(-90 ${cx} 35)` }); });
  return `<svg viewBox="0 0 130 82" width="130" role="img" aria-label="${label}">${s}</svg>`;
}

const hd = (form) => `  <div class="hd">
    <span class="form">Form ${form}</span>
    <span class="course">Core Focus on Proportions &amp; Probability</span>
    <span class="title">Block 5 Review ~ Direct Variation</span>
    <span class="keybadge">ANSWER KEY</span>
    <div class="name"><span>Name<b style="width:3.2in">&nbsp;</b></span><span>Period<b style="width:.6in">&nbsp;</b></span><span>Date<b style="width:1in">&nbsp;</b></span></div>
  </div>`;
const foot = (form, first) => `  <div class="foot"><span>Practice Form ${form}${first ? ' · new problems written to match the Form A review' : ''}</span><span>Core Focus on Proportions &amp; Probability</span></div>`;
const q = (n, body) => `    <div class="q"><span class="n">${n}.</span><div>${body}</div></div>\n`;
const ch = (items, row) => `<ul class="ch${row ? ' row' : ''}">${items.map((t, i) => `<li>${'ABCDEF'[i]}. ${t}</li>`).join('')}</ul>`;
const ans = s => `<div class="ans">${s}</div>`;
const flex = (a, b, gap = 14) => `<div style="display:flex;gap:${gap}px;align-items:center;flex-wrap:wrap">${a}${b}</div>`;
const fig = s => `<figure>${s}</figure>`;
const yn = `<div class="tf" style="grid-template-columns:auto auto auto;justify-content:start;gap:4px 18px"><span>direct variation?</span><span class="opt">YES</span><span class="opt">NO</span></div>`;
const htable = (xs, ys) => `<div class="scroll"><table><tr><th>x</th>${xs.map(x => `<td>${M(x)}</td>`).join('')}</tr><tr><th>y</th>${ys.map(y => `<td>${M(y)}</td>`).join('')}</tr></table></div>`;
const vtable = (rows, h = ['x', 'y']) => `<table><tr><th>${h[0]}</th><th>${h[1]}</th></tr>${rows.map(([x, y]) => `<tr><td>${typeof x === 'number' ? M(x) : x}</td><td>${typeof y === 'number' ? M(y) : y}</td></tr>`).join('')}</table>`;
const ioTable = (rule, xs) => `<table style="min-width:2.9in"><tr><th>Input<br>x</th><th>Function Rule<br>${rule}</th><th>Output<br>y</th></tr>${xs.map(x => `<tr><td>${x}</td><td></td><td></td></tr>`).join('')}</table>`;
const q1grid = label => plane({ xmin: 0, xmax: 12, ymin: 0, ymax: 12, u: 14, quad1: true, padL: 20, padB: 16, label });

function page(form, partI, partII, partIII) {
  const f = form.toLowerCase();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Block 5 Review · Form ${form}</title>
<meta name="review" content='{"block":5,"form":"${form}","topic":"Direct Variation"}'>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap">
<link rel="stylesheet" href="../form.css">
</head>
<body>
<div class="toolbar">
  <a href="../">&larr; All reviews</a>
  <span><a href="../pdf/b5-form-${f}.pdf">Test PDF</a> · <a href="../pdf/b5-form-${f}-key.pdf">Answer key PDF</a></span>
  <button id="toggle" type="button" aria-pressed="false">Show answers</button>
</div>
<main class="sheet">

<!-- ===== PART I ===== -->
<section class="part">
${hd(form)}
  <h2>Part I – Selected Response</h2>
  <div class="cols">
${partI}  </div>
${foot(form, true)}
</section>

<!-- ===== PART II ===== -->
<section class="part">
${hd(form)}
  <h2>Part II – Constructed Response</h2>
${partII}${foot(form)}
</section>

<!-- ===== PART III ===== -->
<section class="part">
${hd(form)}
  <h2>Part III – Problem Solving</h2>
${partIII}${foot(form)}
</section>

</main>
<script src="../form.js"></script>
</body>
</html>
`;
}

// ---------- shared pieces ----------
const isDV = rows => { const nz = rows.filter(([x]) => x !== 0); const k = nz[0][1] / nz[0][0]; return rows.every(([x, y]) => Math.abs(y - k * x) < 1e-9) ? k : null; };
const ioAns = (ruleTxt, xs, f, m) => {
  const ys = xs.map(f); ys.forEach(y => assert(Number.isInteger(y)));
  return `Outputs: ${ys.join(', ')} (${xs.map((x, i) => `${ruleTxt(x)} = ${ys[i]}`).join('; ')}). Graph: points ${xs.map((x, i) => `(${x}, ${ys[i]})`).join(', ')} on a straight line through the origin. Slope = ${m}.`;
};
const S = { // story graph paths, x 0..10, y 0..6
  awayStopAway: [[0, 0], [3, 3], [5.5, 3], [9, 5.5]],
  awayStopHome: [[0, 0], [3.5, 4.5], [6, 4.5], [9.5, 0]],
  upDownUp: [[0, 0], [3, 4], [5.5, 2], [9, 5]],
  speedUpFlatStop: [[0, 0], [3, 4], [6.5, 4], [8.5, 0]],
  speedUpFlat: [[0, 0], [4, 4.5], [10, 4.5]],
  distUpFlat: [[0, 0], [4, 4.5], [10, 4.5]],
  speedFlatUp: [[0, 2], [5, 2], [9, 5.5]],
  speedUpDown: [[0, 0], [4.5, 5], [9, 0]],
};
const P = o => plane(o);

// ===================== FORM B =====================
function formB() {
  let I = '';
  I += q(1, `Which ordered pair represents the point graphed?` + flex(ch([`(${M(-4)}, ${M(-2)})`, `(${M(-2)}, ${M(-4)})`, `(2, 4)`, `(${M(-2)}, 4)`]),
    fig(P({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, u: 13, pts: [{ x: -2, y: -4, l: 'P', dx: -12, dy: -3 }], label: 'Point P plotted at (−2, −4)' })))
    + ans('B. (−2, −4): start at the origin, move 2 left, then 4 down.'));
  I += q(2, `Which graph shows a person riding a bike away from home, stopping to rest, and then riding even farther away from home?
      <div style="display:grid;grid-template-columns:auto auto;gap:6px 10px;margin-top:6px">
      <div>A.${story('Distance|from home', S.awayStopHome, 'Distance graph: up, flat, then down to zero')}</div>
      <div>B.${story('Speed', S.speedUpFlatStop, 'Speed graph: up, flat, then down to zero')}</div>
      <div>C.${story('Distance|from home', S.awayStopAway, 'Distance graph: up, flat, then up again')}</div>
      <div>D.${story('Distance|from home', S.upDownUp, 'Distance graph: up, down, then up')}</div></div>`
    + ans('C. Distance from home goes up (riding away), stays flat (resting, distance does not change), then goes up again (riding farther away).'));
  const t3 = [0, 1, 2, 3, 4].map(x => [x, 5 * x]); assert.equal(isDV(t3), 5);
  I += q(3, `If the values in the table below model direct variation, what is the rate?` + htable(t3.map(r => r[0]), t3.map(r => r[1]))
    + ch(['5', F(1, 5), '10', 'It does not model direct variation.']) + ans('A. 5 (y ÷ x = 5 ÷ 1 = 10 ÷ 2 = 15 ÷ 3 = 20 ÷ 4 = 5)'));
  const t4 = [0, 3, 6, 9, 12].map(x => [x, 4 * x]); assert.equal(isDV(t4), 4);
  I += q(4, `Which equation is the direct variation equation for the values in the table below?` + htable(t4.map(r => r[0]), t4.map(r => r[1]))
    + ch(['y = 12x', 'y = 3x', `y = ${F(1, 4)}x`, 'y = 4x']) + ans('D. y = 4x (m = y ÷ x = 12 ÷ 3 = 4; check 48 ÷ 12 = 4)'));
  const sk5 = [
    sketch([[x => 0.7 * x + 1, -3, 1.4]], 'Line rising, crossing the y-axis above the origin'),
    sketch([[x => -1.2 * x, -1.6, 1.6]], 'Line falling through the origin'),
    sketch([[x => 0.5 * x * x, -2, 2]], 'U-shaped curve with lowest point at the origin'),
    sketch([[x => 1.5 * x, -1.3, 1.3]], 'Line rising through the origin'),
    sketch([[x => 1.3, -3, 3]], 'Horizontal line above the x-axis'),
    sketch([[x => 0.07 * x ** 3 + 0.6 * x - 0.9, -2.7, 2.3]], 'Curve that does not pass through the origin'),
  ];
  I += q(5, `Which graphs show direct variation? Circle all that apply.
      <div style="display:grid;grid-template-columns:auto auto;gap:4px 12px;margin-top:6px">${sk5.map((s, i) => `<div style="display:flex;gap:6px;align-items:center">${'ABCDEF'[i]}.${s}</div>`).join('')}</div>`
    + ans('B, D. Each is a straight line through the origin. A, E and F miss the origin; C passes through the origin but is a curve.'));
  I += q(6, `Which equations are direct variation equations? Circle all that apply.
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;margin-top:6px">
      <span>A. y = ${F('x', 4)}</span><span>B. y = ${F(4, 'x')}</span><span>C. y = −6x</span><span>D. y = 2x + 1</span><span>E. y = 1.5x</span><span>F. y = 3x<sup>2</sup></span></div>`
    + ans('A, C, E. Each has the form y = mx (m = ¼, −6, 1.5). B has x in the denominator, D adds 1, F squares x.'));
  I += q(7, `What is the slope of the direct variation equation y = 0.25x?` + ch([F(1, 4), '4', '25', F(1, 25)]) + ans('A. ¼ (the slope is the number multiplying x: 0.25 = ¼)'));
  I += q(8, `What is the direct variation equation for the line graphed below?` + flex(ch(['y = 3x', `y = −${F(1, 3)}x`, 'y = −3x', `y = ${F(1, 3)}x`]),
    fig(P({ xmin: -6, xmax: 6, ymin: -6, ymax: 6, u: 12, lines: [{ m: -3 }], pts: [-2, -1, 0, 1, 2].map(x => ({ x, y: -3 * x })), label: 'Line through the origin and (1, −3)' })))
    + ans('C. y = −3x (the line passes through (0, 0) and (1, −3): m = −3 ÷ 1 = −3)'));

  // ---- Part II ----
  const p14 = [{ x: -4, y: 2, l: 'A' }, { x: 3, y: 5, l: 'B' }, { x: -3, y: 0, l: 'C' }, { x: 5, y: -3, l: 'D' }];
  let II = `  <div class="q" style="grid-template-columns:1fr auto;gap:12px"><div><p style="margin:0 0 10px">Write the ordered pair for each point on the coordinate plane to the right.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:34px 10px">
    <div><b>1.</b> A${ans('(−4, 2)')}</div><div><b>2.</b> B${ans('(3, 5)')}</div><div><b>3.</b> C${ans('(−3, 0) — on the x-axis')}</div><div><b>4.</b> D${ans('(5, −3)')}</div></div></div>
    ${fig(P({ xmin: -6, xmax: 6, ymin: -6, ymax: 6, u: 13, pts: p14.map(p => ({ ...p, dx: 4, dy: -5 })), label: 'Points A, B, C and D' }))}</div>\n`;
  II += q(5, `Plot the points (${M(-3)}, 2), (3, 2), (3, ${M(-2)}) and (${M(-3)}, ${M(-2)}) and connect them in order. Connect the last point listed to the first point. What shape do the points create?`
    + flex(fig(P({ xmin: -6, xmax: 6, ymin: -6, ymax: 6, u: 13, label: 'Blank coordinate plane' })), `<span style="margin-left:30px">Shape: <b style="display:inline-block;width:1.6in;border-bottom:1px solid var(--ink)">&nbsp;</b></span>`)
    + ans('Rectangle. Points (−3, 2), (3, 2), (3, −2), (−3, −2): the top and bottom sides are 6 units long, the left and right sides are 4 units long, all corners are right angles.'));
  const trip = [[0, 0], [10, 3000], [55, 3000], [70, 0]];
  II += q(6, `Maya walked to the library, studied there, and then walked back home. The graph below shows her distance from home (feet) over time (minutes). For each part, explain how you know your answer is correct.
    <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><ol class="sub" style="flex:1 1 3in;gap:42px;margin-top:10px">
      <li>How far away is the library from Maya’s house?${ans('3,000 feet. The flat part of the graph is at 3,000 feet.')}</li>
      <li>How long did Maya study at the library?${ans('45 minutes. The graph is flat from 10 to 55 minutes: 55 − 10 = 45.')}</li>
      <li>Find Maya’s rate of speed in feet per minute for the walk to the library.${ans('300 feet per minute. 3,000 ft ÷ 10 min = 300.')}</li>
      <li>Find Maya’s rate of speed in feet per minute for the walk home.${ans('200 feet per minute. She walks 3,000 ft from minute 55 to minute 70: 3,000 ÷ 15 = 200.')}</li></ol>
    ${fig(`<div style="text-align:center;font:600 12px var(--display)">Maya’s Trip</div>` + P({ xmin: 0, xmax: 80, ymin: 0, ymax: 3400, u: 3, uy: 0.06, gx: 5, gy: 200, lx: 10, ly: 400, quad1: true, padL: 44, padB: 30, xt: 'Time (minutes)', yt: 'Distance from home (feet)', path: trip,
      pts: [{ x: 10, y: 3000, l: '(10, 3000)', dx: 3, dy: -6, fs: 9 }, { x: 55, y: 3000, l: '(55, 3000)', dx: -14, dy: -6, fs: 9 }, { x: 70, y: 0, l: '(70, 0)', dx: 4, dy: -6, fs: 9 }], label: "Maya's trip graph" }))}</div>`);
  II += `  <p class="dir">Complete each input-output table and graph each function in Quadrant I. What is the slope of each direct variation equation?</p>\n`;
  II += q(7, flex(ioTable('y = 2x', [0, 1, 2, 3, 4]), `<div>${fig(q1grid('Blank Quadrant I grid'))}<div>slope: <b style="display:inline-block;width:.8in;border-bottom:1px solid var(--ink)">&nbsp;</b></div></div>`, 24)
    + ans(ioAns(x => `2(${x})`, [0, 1, 2, 3, 4], x => 2 * x, 2)));
  II += q(8, flex(ioTable(`y = ${F(1, 2)}x`, [0, 2, 4, 6, 8]), `<div>${fig(q1grid('Blank Quadrant I grid'))}<div>slope: <b style="display:inline-block;width:.8in;border-bottom:1px solid var(--ink)">&nbsp;</b></div></div>`, 24)
    + ans(ioAns(x => `½(${x})`, [0, 2, 4, 6, 8], x => x / 2, '½')));
  II += `  <p class="dir">Determine whether each table models direct variation. Circle YES or NO. If it does, give the rate. If not, explain why not.</p>\n`;
  const t9 = [-2, -1, 0, 1, 2].map(x => [x, -3 * x]); assert.equal(isDV(t9), -3);
  const t10 = [-2, -1, 0, 1, 2].map(x => [x, 2 * x + 1]); assert.equal(isDV(t10), null);
  II += q(9, flex(vtable(t9), `<div style="margin-left:40px">${yn}<p style="margin:14px 0 30px">rate/explanation:</p></div>`) + ans('YES; rate −3. y ÷ x = −3 for every pair except (0, 0): 6 ÷ (−2) = −3, 3 ÷ (−1) = −3, −3 ÷ 1 = −3, −6 ÷ 2 = −3.'));
  II += q(10, flex(vtable(t10), `<div style="margin-left:40px">${yn}<p style="margin:14px 0 30px">rate/explanation:</p></div>`) + ans('NO. When x = 0, y = 1, so the graph does not pass through the origin. The ratios y ÷ x are not equal (3 ÷ 1 = 3 but 5 ÷ 2 = 2.5).'));
  II += `  <p class="dir">Determine whether each equation models direct variation. Circle YES or NO. If it does, give the rate. If not, explain why not.</p>\n`;
  II += q(11, `<div style="display:grid;grid-template-columns:1in auto 1fr;gap:10px;align-items:center"><span>y = 0.4x</span>${yn}<span>rate/explanation:</span></div><div style="height:.45in"></div>` + ans('YES; rate 0.4. It has the form y = mx with m = 0.4.'));
  II += q(12, `<div style="display:grid;grid-template-columns:1in auto 1fr;gap:10px;align-items:center"><span>y = 5x − 2</span>${yn}<span>rate/explanation:</span></div><div style="height:.45in"></div>` + ans('NO. The “− 2” means the line crosses the y-axis at (0, −2), not at the origin.'));
  const gA = P({ xmin: 0, xmax: 10, ymin: 0, ymax: 10, u: 13, quad1: true, padL: 20, padB: 16, curves: [{ f: x => x * x / 4, a: 0, b: Math.sqrt(40) }], pts: [{ x: 2, y: 1, l: '(2, 1)', dx: 5, dy: 2, fs: 9 }, { x: 4, y: 4, l: '(4, 4)', dx: 5, dy: 2, fs: 9 }], label: 'Graph A: a curve from the origin through (2, 1) and (4, 4)' });
  const gB = P({ xmin: 0, xmax: 10, ymin: 0, ymax: 10, u: 13, quad1: true, padL: 20, padB: 16, lines: [{ m: 1.5, from: 0 }], pts: [{ x: 2, y: 3, l: '(2, 3)', dx: 5, dy: 3, fs: 9 }, { x: 4, y: 6, l: '(4, 6)', dx: 5, dy: 3, fs: 9 }], label: 'Graph B: a straight line from the origin through (2, 3) and (4, 6)' });
  II += q(13, `Ana says Graph B models direct variation and has a rate of ${F(3, 2)}. Liam says Graph A models direct variation because it passes through the origin. Which person is correct? Explain your reasoning.
    <div style="display:flex;gap:40px;justify-content:center;flex-wrap:wrap;margin-top:6px"><figure style="text-align:center">${gA}<figcaption>Graph A</figcaption></figure><figure style="text-align:center">${gB}<figcaption>Graph B</figcaption></figure></div><div class="work"></div>`
    + ans('Ana is correct. Graph B is a straight line through (0, 0), and y ÷ x = 3 ÷ 2 = 6 ÷ 4 = 3/2. Graph A passes through the origin but is a curve, not a straight line (1 ÷ 2 = ½ but 4 ÷ 4 = 1), so it is not direct variation.'));
  const t14 = [0, 1, 2, 3, 4].map(x => [x, 12 * x]); assert.equal(isDV(t14), 12);
  II += q(14, `A printer prints 12 pages every minute. The table below shows the number of pages printed for the number of minutes the printer runs. Write an equation that shows the number of pages, y, printed in x minutes.
    ${vtable(t14)}<div class="work"></div>` + ans('y = 12x (m = y ÷ x = 12 ÷ 1 = 24 ÷ 2 = 12)'));
  II += q(15, `Graph the direct variation equation y = −2x.` + fig(P({ xmin: -10, xmax: 10, ymin: -10, ymax: 10, u: 16, lx: 2, ly: 2, label: 'Blank coordinate plane from −10 to 10' }))
    + ans('A straight line through the origin that falls from left to right with slope −2: it passes through (−5, 10), (−2, 4), (0, 0), (2, −4) and (5, −10), in Quadrants II and IV.'));

  // ---- Part III ----
  const rows = [0, 3, 6, 9, 12].map(n => [n, n * 4.5]); assert.equal(isDV(rows), 4.5); assert.equal(81 / 4.5, 18);
  const III = `  <div class="task">
    <p>The table below shows the amount of money Jada earned selling bracelets she made.</p>
    ${vtable(rows.map(([n, d]) => [n, d.toFixed(2)]), ['Bracelets Sold', 'Money Earned ($)']).replace('<table>', '<table style="margin:6px auto">')}
    <p>How many bracelets will Jada need to sell to earn $81.00?</p>
    <div class="work xl"></div>
    <div class="ans">18 bracelets. Rate = 13.50 ÷ 3 = $4.50 per bracelet (27 ÷ 6 = 4.50 too), so y = 4.5x. 81 = 4.5x → x = 81 ÷ 4.5 = 18. Check: 18 × 4.50 = 81.00.</div>
  </div>\n`;
  return page('B', I, II, III);
}

// ===================== FORM C =====================
function formC() {
  let I = '';
  I += q(1, `Which ordered pair represents the point graphed?` + flex(ch([`(3, ${M(-2)})`, `(2, ${M(-3)})`, `(${M(-3)}, 2)`, `(${M(-2)}, 3)`]),
    fig(P({ xmin: -5, xmax: 5, ymin: -5, ymax: 5, u: 13, pts: [{ x: -3, y: 2, l: 'K', dx: -12, dy: -4 }], label: 'Point K plotted at (−3, 2)' })))
    + ans('C. (−3, 2): start at the origin, move 3 left, then 2 up.'));
  I += q(2, `Which graph shows a car speeding up and then driving at a constant speed?
      <div style="display:grid;grid-template-columns:auto auto;gap:6px 10px;margin-top:6px">
      <div>A.${story('Speed', S.speedUpFlat, 'Speed graph: rises, then flat')}</div>
      <div>B.${story('Distance|from home', S.distUpFlat, 'Distance graph: rises, then flat')}</div>
      <div>C.${story('Speed', S.speedFlatUp, 'Speed graph: flat, then rises')}</div>
      <div>D.${story('Speed', S.speedUpDown, 'Speed graph: rises, then falls to zero')}</div></div>`
    + ans('A. On a speed graph, rising means speeding up and a flat segment means a constant speed. (B’s flat part means the car is stopped.)'));
  const t3 = [0, 1, 2, 3, 4].map(x => [x, 7 * x]); assert.equal(isDV(t3), 7);
  I += q(3, `If the values in the table below model direct variation, what is the rate?` + htable(t3.map(r => r[0]), t3.map(r => r[1]))
    + ch([F(1, 7), '14', '7', 'It does not model direct variation.']) + ans('C. 7 (y ÷ x = 7 ÷ 1 = 14 ÷ 2 = 21 ÷ 3 = 28 ÷ 4 = 7)'));
  const t4 = [0, 2, 4, 6, 8].map(x => [x, 5 * x]); assert.equal(isDV(t4), 5);
  I += q(4, `Which equation is the direct variation equation for the values in the table below?` + htable(t4.map(r => r[0]), t4.map(r => r[1]))
    + ch(['y = 10x', 'y = 5x', 'y = 2x', `y = ${F(1, 5)}x`]) + ans('B. y = 5x (m = y ÷ x = 10 ÷ 2 = 5; check 40 ÷ 8 = 5)'));
  const sk5 = [
    sketch([[x => 2 * x, -1, 1]], 'Steep line rising through the origin'),
    sketch([[x => 0.8 * x - 1, -1.3, 3]], 'Line rising, crossing the y-axis below the origin'),
    sketch([[x => 1 / x, 0.36, 3], [x => 1 / x, -3, -0.36]], 'Two separate curves, one in Quadrant I and one in Quadrant III'),
    sketch([[x => -0.5 * x, -3, 3]], 'Line falling gently through the origin'),
    sketch([[x => 0.6 * x, -3, 3]], 'Line rising gently through the origin'),
    sketch([[x => -0.45 * x * x + 1.8, -2.6, 2.6]], 'Upside-down U-shaped curve'),
  ];
  I += q(5, `Which graphs show direct variation? Circle all that apply.
      <div style="display:grid;grid-template-columns:auto auto;gap:4px 12px;margin-top:6px">${sk5.map((s, i) => `<div style="display:flex;gap:6px;align-items:center">${'ABCDEF'[i]}.${s}</div>`).join('')}</div>`
    + ans('A, D, E. Each is a straight line through the origin. B is a line that misses the origin; C and F are curves.'));
  I += q(6, `Which equations are direct variation equations? Circle all that apply.
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 14px;margin-top:6px">
      <span>A. y = x − 5</span><span>B. y = 9x</span><span>C. y = ${F(10, 'x')}</span><span>D. y = −${F(3, 4)}x</span><span>E. y = 2<sup>x</sup></span><span>F. y = ${F('x', 3)}</span></div>`
    + ans('B, D, F. Each has the form y = mx (m = 9, −¾, ⅓). A subtracts 5, C has x in the denominator, E has x as an exponent.'));
  I += q(7, `What is the slope of the direct variation equation y = 0.6x?` + ch(['6', F(3, 5), F(1, 6), F(5, 3)]) + ans('B. 3/5 (the slope is the number multiplying x: 0.6 = 6/10 = 3/5)'));
  I += q(8, `What is the direct variation equation for the line graphed below?` + flex(ch([`y = ${F(3, 2)}x`, `y = −${F(2, 3)}x`, 'y = 2x', `y = ${F(2, 3)}x`]),
    fig(P({ xmin: -6, xmax: 6, ymin: -6, ymax: 6, u: 12, lines: [{ m: 2 / 3 }], pts: [-6, -3, 0, 3, 6].map(x => ({ x, y: 2 * x / 3 })), label: 'Line through the origin and (3, 2)' })))
    + ans('D. y = ⅔x (the line passes through (0, 0) and (3, 2): m = 2 ÷ 3 = ⅔)'));

  // ---- Part II ----
  const p14 = [{ x: 2, y: -5, l: 'A' }, { x: -5, y: -3, l: 'B' }, { x: 0, y: 4, l: 'C' }, { x: 4, y: 1, l: 'D' }];
  let II = `  <div class="q" style="grid-template-columns:1fr auto;gap:12px"><div><p style="margin:0 0 10px">Write the ordered pair for each point on the coordinate plane to the right.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:34px 10px">
    <div><b>1.</b> A${ans('(2, −5)')}</div><div><b>2.</b> B${ans('(−5, −3)')}</div><div><b>3.</b> C${ans('(0, 4) — on the y-axis')}</div><div><b>4.</b> D${ans('(4, 1)')}</div></div></div>
    ${fig(P({ xmin: -6, xmax: 6, ymin: -6, ymax: 6, u: 13, pts: p14.map(p => ({ ...p, dx: 4, dy: -5 })), label: 'Points A, B, C and D' }))}</div>\n`;
  II += q(5, `Plot the points (${M(-4)}, 3), (4, 3) and (0, ${M(-3)}) and connect them in order. Connect the last point listed to the first point. What shape do the points create?`
    + flex(fig(P({ xmin: -6, xmax: 6, ymin: -6, ymax: 6, u: 13, label: 'Blank coordinate plane' })), `<span style="margin-left:30px">Shape: <b style="display:inline-block;width:1.6in;border-bottom:1px solid var(--ink)">&nbsp;</b></span>`)
    + ans('Triangle. Points (−4, 3), (4, 3), (0, −3): a flat top side 8 units long and a bottom corner at (0, −3).'));
  const trip = [[0, 0], [2, 120], [6, 120], [9, 0]];
  II += q(6, `Dev’s family drove to a lake, spent time there, and then drove back home. The graph below shows their distance from home (miles) over time (hours). For each part, explain how you know your answer is correct.
    <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap"><ol class="sub" style="flex:1 1 3in;gap:42px;margin-top:10px">
      <li>How far away is the lake from Dev’s house?${ans('120 miles. The flat part of the graph is at 120 miles.')}</li>
      <li>How long did the family stay at the lake?${ans('4 hours. The graph is flat from hour 2 to hour 6: 6 − 2 = 4.')}</li>
      <li>Find the family’s rate of speed in miles per hour for the drive to the lake.${ans('60 miles per hour. 120 mi ÷ 2 h = 60.')}</li>
      <li>Find the family’s rate of speed in miles per hour for the drive home.${ans('40 miles per hour. They drive 120 mi from hour 6 to hour 9: 120 ÷ 3 = 40.')}</li></ol>
    ${fig(`<div style="text-align:center;font:600 12px var(--display)">Dev’s Trip</div>` + P({ xmin: 0, xmax: 10, ymin: 0, ymax: 140, u: 24, uy: 1.45, gx: 1, gy: 10, lx: 1, ly: 20, quad1: true, padL: 40, padB: 30, xt: 'Time (hours)', yt: 'Distance from home (miles)', path: trip,
      pts: [{ x: 2, y: 120, l: '(2, 120)', dx: -8, dy: -6, fs: 9 }, { x: 6, y: 120, l: '(6, 120)', dx: -8, dy: -6, fs: 9 }, { x: 9, y: 0, l: '(9, 0)', dx: 4, dy: -6, fs: 9 }], label: "Dev's trip graph" }))}</div>`);
  II += `  <p class="dir">Complete each input-output table and graph each function in Quadrant I. What is the slope of each direct variation equation?</p>\n`;
  II += q(7, flex(ioTable(`y = ${F(1, 3)}x`, [0, 3, 6, 9, 12]), `<div>${fig(q1grid('Blank Quadrant I grid'))}<div>slope: <b style="display:inline-block;width:.8in;border-bottom:1px solid var(--ink)">&nbsp;</b></div></div>`, 24)
    + ans(ioAns(x => `⅓(${x})`, [0, 3, 6, 9, 12], x => x / 3, '⅓')));
  II += q(8, flex(ioTable(`y = ${F(3, 2)}x`, [0, 2, 4, 6, 8]), `<div>${fig(q1grid('Blank Quadrant I grid'))}<div>slope: <b style="display:inline-block;width:.8in;border-bottom:1px solid var(--ink)">&nbsp;</b></div></div>`, 24)
    + ans(ioAns(x => `3/2(${x})`, [0, 2, 4, 6, 8], x => 3 * x / 2, '3/2 (or 1.5)')));
  II += `  <p class="dir">Determine whether each table models direct variation. Circle YES or NO. If it does, give the rate. If not, explain why not.</p>\n`;
  const t9 = [-4, -2, 0, 2, 4].map(x => [x, x / 2]); assert.equal(isDV(t9), 0.5);
  const t10 = [[-2, -10], [-1, -5], [0, 0], [1, 5], [2, 12]]; assert.equal(isDV(t10), null);
  II += q(9, flex(vtable(t9), `<div style="margin-left:40px">${yn}<p style="margin:14px 0 30px">rate/explanation:</p></div>`) + ans('YES; rate ½. y ÷ x = ½ for every pair except (0, 0): −2 ÷ (−4) = ½, −1 ÷ (−2) = ½, 1 ÷ 2 = ½, 2 ÷ 4 = ½.'));
  II += q(10, flex(vtable(t10), `<div style="margin-left:40px">${yn}<p style="margin:14px 0 30px">rate/explanation:</p></div>`) + ans('NO. The ratios y ÷ x are not all equal: −10 ÷ (−2) = 5, −5 ÷ (−1) = 5, 5 ÷ 1 = 5, but 12 ÷ 2 = 6.'));
  II += `  <p class="dir">Determine whether each equation models direct variation. Circle YES or NO. If it does, give the rate. If not, explain why not.</p>\n`;
  II += q(11, `<div style="display:grid;grid-template-columns:1in auto 1fr;gap:10px;align-items:center"><span>y = 6x<sup>2</sup></span>${yn}<span>rate/explanation:</span></div><div style="height:.45in"></div>` + ans('NO. The x is squared, so the graph is a curve, not a straight line.'));
  II += q(12, `<div style="display:grid;grid-template-columns:1in auto 1fr;gap:10px;align-items:center"><span>y = ${F('x', 5)}</span>${yn}<span>rate/explanation:</span></div><div style="height:.45in"></div>` + ans('YES; rate ⅕. y = x/5 is the same as y = ⅕x, which has the form y = mx with m = ⅕ (or 0.2).'));
  const gA = P({ xmin: 0, xmax: 10, ymin: 0, ymax: 10, u: 13, quad1: true, padL: 20, padB: 16, lines: [{ m: 1, b: 2, from: 0 }], pts: [{ x: 0, y: 2, l: '(0, 2)', dx: 6, dy: 11, fs: 9 }, { x: 4, y: 6, l: '(4, 6)', dx: 5, dy: 4, fs: 9 }], label: 'Graph A: a straight line starting at (0, 2) through (4, 6)' });
  const gB = P({ xmin: 0, xmax: 10, ymin: 0, ymax: 10, u: 13, quad1: true, padL: 20, padB: 16, lines: [{ m: 1 / 3, from: 0 }], pts: [{ x: 3, y: 1, l: '(3, 1)', dx: -4, dy: -7, fs: 9 }, { x: 6, y: 2, l: '(6, 2)', dx: -4, dy: -7, fs: 9 }], label: 'Graph B: a straight line from the origin through (3, 1) and (6, 2)' });
  II += q(13, `Ken says Graph A models direct variation because it is a straight line and has a rate of 1. Rosa says Graph B models direct variation and has a rate of ${F(1, 3)}. Which person is correct? Explain your reasoning.
    <div style="display:flex;gap:40px;justify-content:center;flex-wrap:wrap;margin-top:6px"><figure style="text-align:center">${gA}<figcaption>Graph A</figcaption></figure><figure style="text-align:center">${gB}<figcaption>Graph B</figcaption></figure></div><div class="work"></div>`
    + ans('Rosa is correct. Graph B is a straight line through (0, 0), and y ÷ x = 1 ÷ 3 = 2 ÷ 6 = ⅓. Graph A is a straight line, but it starts at (0, 2), so it does not pass through the origin and is not direct variation.'));
  const t14 = [0, 3, 6, 9, 12].map(x => [x, 6 * x]); assert.equal(isDV(t14), 6);
  II += q(14, `Tickets to the school play cost $6 each. The table below shows the total cost for the number of tickets bought. Write an equation that shows the total cost, y, of x tickets.
    ${vtable(t14)}<div class="work"></div>` + ans('y = 6x (m = y ÷ x = 18 ÷ 3 = 36 ÷ 6 = 6)'));
  II += q(15, `Graph the direct variation equation y = 3x.` + fig(P({ xmin: -10, xmax: 10, ymin: -10, ymax: 10, u: 16, lx: 2, ly: 2, label: 'Blank coordinate plane from −10 to 10' }))
    + ans('A straight line through the origin that rises from left to right with slope 3: it passes through (−3, −9), (−2, −6), (−1, −3), (0, 0), (1, 3), (2, 6) and (3, 9), in Quadrants III and I.'));

  // ---- Part III ----
  const rows = [0, 2, 4, 6, 8].map(n => [n, n * 11.5]); assert.equal(isDV(rows), 11.5); assert.equal(161 / 11.5, 14);
  const III = `  <div class="task">
    <p>The table below shows the amount of money Marcus earned walking dogs in his neighborhood.</p>
    ${vtable(rows.map(([n, d]) => [n, d.toFixed(2)]), ['Hours Walking Dogs', 'Money Earned ($)']).replace('<table>', '<table style="margin:6px auto">')}
    <p>How many hours will Marcus need to walk dogs to earn $161.00?</p>
    <div class="work xl"></div>
    <div class="ans">14 hours. Rate = 23.00 ÷ 2 = $11.50 per hour (46 ÷ 4 = 11.50 too), so y = 11.5x. 161 = 11.5x → x = 161 ÷ 11.5 = 14. Check: 14 × 11.50 = 161.00.</div>
  </div>\n`;
  return page('C', I, II, III);
}

for (const [slug, html] of [['b5-form-b', formB()], ['b5-form-c', formC()]]) {
  mkdirSync(`${OUT}/${slug}`, { recursive: true });
  writeFileSync(`${OUT}/${slug}/index.html`, html);
  console.log('wrote', slug, html.length);
}
