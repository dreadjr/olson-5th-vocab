// "Watch it": a whiteboard walkthrough generated from a problem's worked steps. Each step is written in marker
// handwriting while a voice reads it; numbers in blue, fractions stacked with the bar drawn in, the answer circled.
// No video files: Board.play({ title, question, steps }) builds it live, so it works for every question and every
// Practice problem, offline, and follows any fix to the hints. Used by math/help.js.
(() => {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let styled = false;
  function style() {
    if (styled) return;
    styled = true;
    document.head.append(Object.assign(el('link'), { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap' }));
    document.head.append(el('style', '', `
.board{width:min(920px,100vw);max-width:100vw;height:min(640px,100dvh);max-height:100dvh;padding:0;border:0;border-radius:14px;background:transparent;overflow:visible}
.board::backdrop{background:rgba(10,14,20,.6)}
.board-frame{position:relative;display:flex;flex-direction:column;height:100%;border-radius:14px;overflow:hidden;background:#fdfdfb;
  box-shadow:inset 0 0 0 10px #c9ccd1,inset 0 0 0 12px #9aa0a8,0 20px 60px rgba(0,0,0,.35);color:#1f2a37}
.board-bar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:14px 18px 6px;font:600 13px "Libre Franklin",system-ui,sans-serif}
.board-bar b{flex:1;min-width:120px}
.board-bar button,.board-bar label{min-height:40px;padding:0 12px;border:1.5px solid #9aa0a8;border-radius:8px;background:#fff;color:#1f2a37;font:600 13px "Libre Franklin",system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.board-bar button.primary{background:#1f4e79;border-color:#1f4e79;color:#fff}
.board-bar select{font:inherit;border:0;background:none}
.board-ink{flex:1;overflow:auto;padding:6px 28px 24px;font:28px/1.45 "Patrick Hand","Comic Sans MS",cursive;scroll-behavior:smooth}
.board-q{font-size:22px;color:#4b5563;border-bottom:2px dashed #d1d5db;padding-bottom:8px;margin-bottom:10px}
.board-line{margin:6px 0;min-height:1.4em}
.board-line .n{color:#1d4ed8}
.board-line .bf{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1;margin:0 3px;font-size:.85em;color:#1d4ed8}
.board-line .bf>span:first-child{padding:0 3px 2px;border-bottom:2.5px solid currentColor;transform-origin:left;animation:bar .35s ease-out both}
.board-line .bf>span:last-child{padding-top:2px}
@keyframes bar{from{border-bottom-color:transparent}to{border-bottom-color:currentColor}}
.board-think{margin:10px 0;font-size:24px;color:#b45309}
.board-think button{margin-left:8px;font:600 15px "Libre Franklin",system-ui,sans-serif;min-height:40px;padding:0 14px;border:0;border-radius:8px;background:#b45309;color:#fff;cursor:pointer}
.board-circle{position:absolute;pointer-events:none;overflow:visible}
.board-circle ellipse{fill:none;stroke:#dc2626;stroke-width:3.5;stroke-linecap:round;stroke-dasharray:400;stroke-dashoffset:400;animation:circle .9s ease-out forwards}
@keyframes circle{to{stroke-dashoffset:0}}
.board-pen{display:inline-block;width:3px;height:1em;margin-left:2px;vertical-align:-.12em;background:#1f2a37;animation:blink 1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
@media (prefers-color-scheme:dark){.board-frame{background:#1e2a24;color:#f1f5f9;box-shadow:inset 0 0 0 10px #6b4f33,inset 0 0 0 12px #4a3522,0 20px 60px rgba(0,0,0,.5)}
  .board-q{color:#cbd5e1;border-color:#4b5563}.board-line .n,.board-line .bf{color:#93c5fd}.board-pen{background:#f1f5f9}
  .board-bar button,.board-bar label{background:#273449;color:#f1f5f9;border-color:#4b5563}.board-think{color:#fbbf24}}
@media (prefers-reduced-motion:reduce){.board-line .bf>span:first-child,.board-circle ellipse{animation:none;stroke-dashoffset:0}.board-ink{scroll-behavior:auto}}
@media (max-width:640px){.board{height:100dvh;border-radius:0}.board-frame{border-radius:0}.board-ink{font-size:24px;padding:6px 18px 20px}.board-q{font-size:18px}}`));
  }

  // Said the way a teacher says it.
  const speakable = (s) => s.replace(/\bP\(([^()]*)\)/g, 'the probability of $1').replace(/[·×]/g, ' times ').replace(/÷/g, ' divided by ')
    .replace(/−/g, ' minus ').replace(/=/g, ' equals ').replace(/(\d)\s*–\s*(\d)/g, '$1 to $2').replace(/%/g, ' percent')
    .replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g, '$1 over $2').replace(/\(\s*(-?\d+),\s*(-?\d+)\s*\)/g, 'the point $1 comma $2');

  function play({ title = 'Watch it', question = '', steps = [] }) {
    style();
    const dlg = el('dialog', 'board');
    dlg.setAttribute('aria-label', `${title}: whiteboard walkthrough`);
    const frame = el('div', 'board-frame');
    const bar = el('div', 'board-bar');
    const ink = el('div', 'board-ink');
    ink.setAttribute('aria-live', 'polite');
    const btn = (label, cls) => { const b = el('button', cls || '', label); b.type = 'button'; return b; };
    const playB = btn('Pause', 'primary'), prevB = btn('◀ Back'), nextB = btn('Next ▶'), replayB = btn('Replay'), closeB = btn('Close');
    prevB.setAttribute('aria-label', 'Back one step');
    nextB.setAttribute('aria-label', 'Next step');
    const speed = el('select');
    for (const v of ['0.75', '1', '1.25', '1.5']) speed.append(Object.assign(el('option', '', `${v}×`), { value: v, selected: v === '1' }));
    speed.setAttribute('aria-label', 'Speed');
    const voiceL = el('label'), voice = Object.assign(el('input'), { type: 'checkbox', checked: 'speechSynthesis' in window });
    voiceL.append(voice, 'Voice');
    const thinkL = el('label'), think = Object.assign(el('input'), { type: 'checkbox' });
    thinkL.append(think, 'Think first');
    bar.append(el('b', '', title), prevB, playB, nextB, replayB, speed, voiceL, thinkL, closeB);
    frame.append(bar, ink);
    dlg.append(frame);
    document.body.append(dlg);
    dlg.showModal();

    let run = 0, paused = false, skip = false, resume = null;
    const rate = () => Number(speed.value);
    const gate = () => (paused ? new Promise((r) => { resume = r; }) : null);
    const stopVoice = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); };
    const say = (text) => new Promise((r) => {
      if (!voice.checked || !('speechSynthesis' in window)) return r();
      const u = new SpeechSynthesisUtterance(speakable(text));
      u.lang = 'en-US';
      u.rate = 0.95 * rate();
      u.onend = u.onerror = () => r();
      speechSynthesis.speak(u);
    });

    // Write one line like a marker: characters one at a time, numbers in blue, fractions stacked with the bar drawn.
    async function write(line, text, id) {
      const pen = el('span', 'board-pen');
      line.append(pen);
      for (const tok of text.split(/(\d+(?:\.\d+)?\/\d+(?:\.\d+)?|-?\d+(?:[.,]\d+)*%?)/)) {
        if (!tok) continue;
        if (id !== run) return;
        const f = tok.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
        if (f) {
          const bf = el('span', 'bf n');
          bf.append(el('span', '', f[1]), el('span', '', f[2]));
          bf.setAttribute('aria-label', `${f[1]} over ${f[2]}`);
          line.insertBefore(bf, pen);
          if (!skip) await wait(260 / rate());
          continue;
        }
        const span = /^-?\d/.test(tok) ? el('span', 'n') : null;
        const target = span || document.createTextNode('');
        line.insertBefore(target, pen);
        for (const ch of tok) {
          await gate();
          if (id !== run) return;
          (span ? span : target).textContent += ch;
          if (!skip) await wait((ch === ' ' ? 20 : 34) / rate());
        }
      }
      pen.remove();
    }

    // The last number or fraction on the board, circled in red.
    function circleAnswer() {
      const last = [...ink.querySelectorAll('.board-line:last-child .n')].at(-1);
      if (!last) return;
      const a = last.getBoundingClientRect(), b = frame.getBoundingClientRect();
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'board-circle');
      const w = a.width + 26, h = a.height + 18;
      Object.assign(svg.style, { left: `${a.left - b.left - 13}px`, top: `${a.top - b.top - 9}px`, width: `${w}px`, height: `${h}px` });
      const e = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      for (const [k, v] of Object.entries({ cx: w / 2, cy: h / 2, rx: w / 2 - 2, ry: h / 2 - 2, transform: `rotate(-4 ${w / 2} ${h / 2})` })) e.setAttribute(k, v);
      svg.append(e);
      frame.append(svg);
    }

    async function from(start) {
      const id = ++run;
      stopVoice();
      frame.querySelectorAll('.board-circle').forEach((c) => c.remove());
      ink.querySelectorAll('.board-line, .board-think').forEach((n, i) => { if (n.classList.contains('board-think') || Number(n.dataset.i) >= start) n.remove(); });
      for (let i = start; i < steps.length; i++) {
        skip = false;
        if (think.checked && i > 0) {
          const t = el('div', 'board-think', 'What do you think comes next?');
          const show = btn('Show me');
          t.append(show);
          ink.append(t);
          ink.scrollTop = ink.scrollHeight;
          await new Promise((r) => show.addEventListener('click', r, { once: true }));
          if (id !== run) return;
          t.remove();
        }
        const line = el('div', 'board-line');
        line.dataset.i = i;
        ink.append(line);
        ink.scrollTop = ink.scrollHeight;
        await Promise.all([write(line, steps[i], id), say(steps[i])]);
        if (id !== run) return;
        await wait(450 / rate());
        if (id !== run) return;
      }
      circleAnswer();
      playB.textContent = 'Replay';
    }
    const at = () => ink.querySelectorAll('.board-line').length;

    playB.addEventListener('click', () => {
      if (playB.textContent === 'Replay') { playB.textContent = 'Pause'; paused = false; return from(0); }
      paused = !paused;
      playB.textContent = paused ? 'Play' : 'Pause';
      if ('speechSynthesis' in window) paused ? speechSynthesis.pause() : speechSynthesis.resume();
      if (!paused && resume) { resume(); resume = null; }
    });
    // Next: finish the step being written right away (or answer "Show me"), then carry on.
    nextB.addEventListener('click', () => {
      if (playB.textContent === 'Replay') return;
      paused = false; playB.textContent = 'Pause'; resume?.(); resume = null;
      const show = ink.querySelector('.board-think button');
      if (show) return show.click();
      skip = true;
      stopVoice();
    });
    prevB.addEventListener('click', () => { paused = false; playB.textContent = 'Pause'; resume?.(); from(Math.max(0, at() - 2)); });
    replayB.addEventListener('click', () => { paused = false; playB.textContent = 'Pause'; resume?.(); from(0); });
    const close = () => { run++; stopVoice(); dlg.close(); dlg.remove(); };
    closeB.addEventListener('click', close);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });

    const q = el('div', 'board-q', question);
    ink.append(q);
    from(0);
    return dlg;
  }

  globalThis.Board = { play };
})();
