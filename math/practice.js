// "Practice more like this": problem templates per skill. Each makes a new problem with new numbers; the answer
// is computed here (exact fractions via Calc from calc.js), never by AI. Plain JS so scripts/practice.test.mjs runs it.
// Practice.make(kind, seed) -> { q, answer | choice, hint, steps }   (q and steps use a/b for fractions, · for times)
(() => {
  const C = () => globalThis.Calc;
  const frac = (expr) => C().evalLines(expr)[0].text; // "9/36" -> "1/4", "6*8" -> "48"
  const num = (x) => String(Math.round(x * 1000) / 1000); // tidy decimals for display
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tools = (r) => ({
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    shuffle: (arr) => arr.map((v) => [r(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]),
  });
  const list = (xs) => xs.join(', ');
  const sorted = (xs) => [...xs].sort((a, b) => a - b);

  // A data set of n whole numbers between lo and hi whose mean is a whole number.
  const dataSet = (t, n, lo, hi) => {
    for (;;) {
      const xs = Array.from({ length: n - 1 }, () => t.int(lo, hi));
      const s = xs.reduce((a, b) => a + b, 0);
      for (let last = lo; last <= hi; last++) if ((s + last) % n === 0 && t.int(0, 2) === 0) return t.shuffle([...xs, last]);
    }
  };

  const K = {
    'exp-prob': { label: 'Experimental probability', lesson: '4.1', make(t) {
      const ctx = t.pick([
        (N, k) => [`Of the first ${N} customers at a lemonade stand, ${k} bought pink lemonade.`, 'the next customer buys pink lemonade'],
        (N, k) => [`Mia took ${N} free throws and made ${k} of them.`, 'she makes her next free throw'],
        (N, k) => [`A coin was flipped ${N} times and landed heads ${k} times.`, 'the next flip lands heads'],
        (N, k) => [`Of ${N} students who came to the library today, ${k} checked out a mystery book.`, 'the next student checks out a mystery book'],
      ]);
      const N = t.pick([20, 24, 25, 30, 36, 40, 48, 50, 60]);
      let k; do k = t.int(2, N - 2); while (gcd(k, N) === 1);
      const [story, next] = ctx(N, k);
      const a = frac(`${k}/${N}`);
      return { q: `${story} What is the experimental probability that ${next}?`, answer: a,
        hint: 'Experimental probability = (times it happened) ÷ (total tries).',
        steps: [`Experimental probability = (times it happened) ÷ (total tries).`, `It happened ${k} times out of ${N}: ${k}/${N}.`, `Simplify: ${k}/${N} = ${a}.`] };
    } },
    'theo-prob': { label: 'Theoretical probability', lesson: '4.1', make(t) {
      const S = t.pick([6, 8, 10, 12]);
      const ev = t.pick([
        () => { const v = t.int(2, S - 2); return [`a number greater than ${v}`, (x) => x > v]; },
        () => { const v = t.int(3, S - 1); return [`a number less than ${v}`, (x) => x < v]; },
        () => ['an even number', (x) => x % 2 === 0],
        () => { const m = t.pick([3, 4, 5]); return [`a multiple of ${m}`, (x) => x % m === 0]; },
        () => [`a number greater than ${S}`, () => false],
        () => [`a number less than ${S + 1}`, () => true],
      ])();
      const hits = Array.from({ length: S }, (_, i) => i + 1).filter(ev[1]);
      const a = frac(`${hits.length}/${S}`);
      return { q: `A spinner has ${S} equal sections numbered 1 to ${S}. You spin it once. What is P(${ev[0]})?`, answer: a,
        hint: 'P(event) = (number of ways it can happen) ÷ (number of equally likely outcomes).',
        steps: [`There are ${S} equally likely outcomes.`, hits.length ? `The ones that count: ${list(hits)}. That's ${hits.length}.` : 'No section counts, so it is impossible.', `P = ${hits.length}/${S} = ${a}.`] };
    } },
    'predict': { label: 'Predicting with probability', lesson: '4.2', make(t) {
      const r = t.int(2, 6), w = t.int(1, 5), b = t.int(1, 4), T = r + w + b;
      const D = T * t.int(3, 10), [color, c] = t.pick([['red', r], ['white', w], ['blue', b]]);
      const a = frac(`${c}/${T}*${D}`);
      return { q: `A bag has ${r} red, ${w} white and ${b} blue marbles. A marble is drawn and put back ${D} times. About how many times would you expect to draw ${color}?`, answer: a,
        hint: 'Find P(that color), then multiply by the number of draws.',
        steps: [`There are ${r} + ${w} + ${b} = ${T} marbles, so P(${color}) = ${c}/${T}.`, `Expected = P · draws = ${c}/${T} · ${D}.`, `${c}/${T} · ${D} = ${a} times.`] };
    } },
    'capture': { label: 'Capture–recapture', lesson: '4.2', make(t) {
      const tagged = t.int(2, 6), caught = tagged * t.int(3, 8), M = t.int(4, 15) * 5;
      const animal = t.pick(['turtles', 'fish', 'rabbits', 'frogs']);
      const n = M * caught / tagged;
      return { q: `A ranger catches, tags and releases ${M} ${animal}. A week later she catches ${caught} ${animal}, and ${tagged} of them have tags. About how many ${animal} live there?`, answer: String(n),
        hint: 'Tagged in the sample ÷ sample size = tagged in all ÷ total. Solve for the total.',
        steps: [`Set up the proportion: ${tagged}/${caught} = ${M}/n.`, `Cross-multiply: ${tagged} · n = ${M} · ${caught} = ${M * caught}.`, `n = ${M * caught} ÷ ${tagged} = ${n}.`] };
    } },
    'data-prob': { label: 'Probability from data', lesson: '4.3', make(t) {
      const cats = t.shuffle(['pizza', 'tacos', 'salad', 'pasta', 'soup']).slice(0, 4);
      const counts = cats.map(() => t.int(3, 18)), T = counts.reduce((a, b) => a + b, 0);
      const two = t.int(0, 1) === 1, i = t.int(0, 3), j = (i + 1) % 4;
      const c = two ? counts[i] + counts[j] : counts[i];
      const a = frac(`${c}/${T}`);
      const what = two ? `${cats[i]} or ${cats[j]}` : cats[i];
      return { q: `Students voted for their favorite lunch: ${cats.map((x, k) => `${x} ${counts[k]}`).join(', ')}. What is the probability that a randomly chosen student voted for ${what}?`, answer: a,
        hint: 'Add all the votes for the total. Then P = votes for it ÷ total.',
        steps: [`Total votes: ${counts.join(' + ')} = ${T}.`, two ? `${cats[i]} or ${cats[j]}: ${counts[i]} + ${counts[j]} = ${c}.` : `${cats[i]}: ${c} votes.`, `P = ${c}/${T} = ${a}.`] };
    } },
    'sector': { label: 'Pie chart sector angles', lesson: '4.3', make(t) {
      const T = t.pick([20, 24, 30, 36, 40, 45, 60, 72, 90]);
      const c = t.int(2, Math.floor(T / 2));
      const a = frac(`${c}/${T}*360`);
      return { q: `In a survey of ${T} people, ${c} chose soccer as their favorite sport. In a pie chart of the results, how many degrees is the soccer sector?`, answer: a,
        hint: 'A full circle is 360°. Take the fraction of people who chose soccer, of 360.',
        steps: [`Soccer's share: ${c}/${T}.`, `Degrees = ${c}/${T} · 360.`, `${c}/${T} · 360 = ${a}°.`] };
    } },
    'count-outcomes': { label: 'Counting outcomes', lesson: '4.4', make(t) {
      const a = t.int(2, 5), f = t.int(2, 6), s = t.int(2, 4);
      const three = t.int(0, 1) === 1;
      const n = three ? a * f * s : a * f;
      return { q: three ? `A sandwich shop has ${a} kinds of bread, ${f} fillings and ${s} sauces. How many different sandwiches can you make with one bread, one filling and one sauce?`
        : `A snack bar has ${a} kinds of fruit and ${f} kinds of yogurt. How many different snacks can you make with one fruit and one yogurt?`, answer: String(n),
        hint: 'Each choice can go with every choice from the other list. Multiply the numbers of choices.',
        steps: three ? [`Each of the ${a} breads can go with each of the ${f} fillings: ${a} · ${f} = ${a * f}.`, `Each of those goes with ${s} sauces: ${a * f} · ${s} = ${n}.`]
          : [`Each of the ${a} fruits can go with each of the ${f} yogurts.`, `${a} · ${f} = ${n} snacks.`] };
    } },
    'no-repeat': { label: 'Counting with no repeats', lesson: '4.5', make(t) {
      const N = t.int(5, 12), three = t.int(0, 2) === 0;
      const n = three ? N * (N - 1) * (N - 2) : N * (N - 1);
      return { q: three ? `${N} runners are in a race. In how many different ways can the gold, silver and bronze medals be awarded?`
        : `${N} students are running for class president and vice president. In how many different ways can the two jobs be filled?`, answer: String(n),
        hint: 'After someone gets the first place, they can’t get the next one too. Each place has one fewer choice.',
        steps: three ? [`${N} choices for gold, then ${N - 1} left for silver, then ${N - 2} for bronze.`, `${N} · ${N - 1} · ${N - 2} = ${n}.`]
          : [`${N} choices for president, then ${N - 1} left for vice president.`, `${N} · ${N - 1} = ${n}.`] };
    } },
    'independent': { label: 'Probability of independent events', lesson: '4.5', make(t) {
      return t.pick([
        () => {
          const k = t.int(2, 4), L = t.int(4, 8), last = String.fromCharCode(64 + L), code = Array.from({ length: k }, () => String.fromCharCode(65 + t.int(0, L - 1))).join('-');
          const a = frac(`1/${L ** k}`);
          return { q: `A lock has ${k} wheels. Each wheel shows one of the letters A – ${last}. What is the probability that a random code is ${code}?`, answer: a,
            hint: 'Each wheel is a separate event. Multiply the probability for each wheel.',
            steps: [`Each wheel has ${L} letters, so P(the right letter) = 1/${L} for each.`, `${k} wheels: ${Array(k).fill(`1/${L}`).join(' · ')}.`, `= ${a}.`] };
        },
        () => {
          const [ev, n] = t.pick([['an even number', 3], ['a number greater than 4', 2], ['a 5', 1], ['a number less than 3', 2]]);
          const a = frac(`1/2*${n}/6`);
          return { q: `You flip a coin and roll a number cube (1 to 6). What is P(heads and ${ev})?`, answer: a,
            hint: 'Find each probability separately, then multiply.',
            steps: [`P(heads) = 1/2.`, `P(${ev}) = ${n}/6.`, `1/2 · ${n}/6 = ${a}.`] };
        },
        () => {
          const S = t.pick([4, 5, 8]), x = t.int(1, S), y = t.int(1, S);
          const a = frac(`1/${S * S}`);
          return { q: `A spinner has ${S} equal sections numbered 1 to ${S}. You spin it twice. What is P(${x} then ${y})?`, answer: a,
            hint: 'Each spin is separate. Multiply the probability of each.',
            steps: [`P(${x}) = 1/${S} and P(${y}) = 1/${S}.`, `1/${S} · 1/${S} = ${a}.`] };
        },
      ])();
    } },
    'sample-predict': { label: 'Predicting from a sample', lesson: '4.7', make(t) {
      const s = t.pick([20, 25, 30, 40, 50]), a = t.int(3, s - 5), N = s * t.int(10, 40) / gcd(s, a) * gcd(s, a);
      const pop = (a * N) / s;
      if (!Number.isInteger(pop)) return K['sample-predict'].make(t);
      return { q: `In a random sample of ${s} students at a school, ${a} said they walk to school. There are ${N} students at the school. About how many walk to school?`, answer: String(pop),
        hint: 'The sample’s fraction should be about the same for the whole school.',
        steps: [`In the sample, ${a}/${s} walk.`, `Whole school: ${a}/${s} · ${N}.`, `= ${pop} students.`] };
    } },
    'mean': { label: 'Mean', lesson: '4.8', make(t) {
      const xs = dataSet(t, t.int(5, 8), 2, 30), s = xs.reduce((a, b) => a + b, 0);
      return { q: `Find the mean of: ${list(xs)}.`, answer: String(s / xs.length),
        hint: 'Add all the numbers, then divide by how many there are.',
        steps: [`Add them: ${xs.join(' + ')} = ${s}.`, `There are ${xs.length} numbers: ${s} ÷ ${xs.length} = ${s / xs.length}.`] };
    } },
    'median': { label: 'Median', lesson: '4.8', make(t) {
      const xs = Array.from({ length: t.int(5, 10) }, () => t.int(1, 40)), ys = sorted(xs), m = ys.length >> 1;
      const odd = ys.length % 2 === 1, a = odd ? String(ys[m]) : frac(`(${ys[m - 1]}+${ys[m]})/2`);
      return { q: `Find the median of: ${list(xs)}.`, answer: a,
        hint: 'Put the numbers in order. The median is the middle one (or the average of the two middle ones).',
        steps: [`In order: ${list(ys)}.`, odd ? `There are ${ys.length} numbers, so the middle one is number ${m + 1}: ${ys[m]}.` : `There are ${ys.length} numbers, so average the two in the middle: (${ys[m - 1]} + ${ys[m]}) ÷ 2 = ${num((ys[m - 1] + ys[m]) / 2)}.`] };
    } },
    'mad': { label: 'Mean absolute deviation', lesson: '4.8', make(t) {
      const xs = dataSet(t, t.int(5, 6), 2, 20), n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n;
      const d = xs.map((x) => Math.abs(x - mean)), s = d.reduce((a, b) => a + b, 0), a = frac(`${s}/${n}`);
      return { q: `Find the mean absolute deviation (MAD) of: ${list(xs)}.`, answer: a,
        hint: 'Find the mean. Then find how far each number is from the mean, and average those distances.',
        steps: [`Mean: ${xs.join(' + ')} = ${xs.reduce((p, q) => p + q, 0)}, ÷ ${n} = ${mean}.`, `Distances from ${mean}: ${list(d)}.`, `Average distance: ${s} ÷ ${n} = ${a}${a.includes('/') ? ` = ${num(s / n)}` : ''}.`] };
    } },
    'iqr': { label: 'Interquartile range', lesson: '4.8', make(t) {
      const xs = Array.from({ length: t.pick([7, 8, 9]) }, () => t.int(2, 50)), ys = sorted(xs), h = ys.length >> 1;
      const lo = ys.slice(0, h), hi = ys.slice(ys.length % 2 ? h + 1 : h);
      const q1 = frac(`median(${lo.join(' ')})`), q3 = frac(`median(${hi.join(' ')})`), a = frac(`median(${hi.join(' ')}) - median(${lo.join(' ')})`);
      return { q: `Find the interquartile range (IQR) of: ${list(xs)}.`, answer: a,
        hint: 'IQR = Q3 − Q1. Q1 is the median of the lower half, Q3 of the upper half (leave out the middle number if there is one).',
        steps: [`In order: ${list(ys)}.`, `Lower half ${list(lo)}: Q1 = ${q1}. Upper half ${list(hi)}: Q3 = ${q3}.`, `IQR = ${q3} − ${q1} = ${a}.`] };
    } },
    'range': { label: 'Range', lesson: '4.8', make(t) {
      const xs = Array.from({ length: t.int(6, 9) }, () => t.int(1, 60)), ys = sorted(xs);
      return { q: `Find the range of: ${list(xs)}.`, answer: String(ys.at(-1) - ys[0]),
        hint: 'Range = biggest − smallest.',
        steps: [`Biggest: ${ys.at(-1)}. Smallest: ${ys[0]}.`, `${ys.at(-1)} − ${ys[0]} = ${ys.at(-1) - ys[0]}.`] };
    } },
    'ordered-pair': { label: 'Ordered pairs', lesson: '5.1', make(t) {
      let x, y; do { x = t.int(-6, 6); y = t.int(-6, 6); } while (!x && !y);
      const h = x === 0 ? 'don’t move left or right' : `move ${Math.abs(x)} unit${Math.abs(x) > 1 ? 's' : ''} ${x < 0 ? 'left' : 'right'}`;
      const v = y === 0 ? 'don’t move up or down' : `${Math.abs(y)} unit${Math.abs(y) > 1 ? 's' : ''} ${y < 0 ? 'down' : 'up'}`;
      return { q: `Start at the origin. ${h[0].toUpperCase() + h.slice(1)}, then ${y === 0 ? v : `move ${v}`}. What ordered pair are you at?`, answer: `(${x}, ${y})`,
        hint: 'Left/right is the first number (x); up/down is the second (y). Left and down are negative.',
        steps: [`Left/right gives x: ${x}.`, `Up/down gives y: ${y}.`, `The point is (${x}, ${y}).`] };
    } },
    'rate-table': { label: 'Rate from a table', lesson: '5.3', make(t) {
      const k = t.pick([2, 3, 4, 5, 6, 8, 1.5, 2.5, 0.5]), xs = t.pick([[1, 2, 3, 4], [2, 4, 6, 8], [0, 1, 2, 3]]);
      return { q: `In this table, y varies directly with x. x: ${list(xs)}. y: ${list(xs.map((x) => num(k * x)))}. What is the rate (constant of variation)?`, answer: num(k),
        hint: 'Divide y by x for any pair (not 0, 0).',
        steps: [`Pick a pair: x = ${xs[1]}, y = ${num(k * xs[1])}.`, `y ÷ x = ${num(k * xs[1])} ÷ ${xs[1]} = ${num(k)}.`, `Check another pair: ${num(k * xs[2])} ÷ ${xs[2]} = ${num(k)}. The rate is ${num(k)}.`] };
    } },
    'dv-equation': { label: 'Writing y = mx', lesson: '5.4', make(t) {
      const k = t.pick([2, 3, 4, 5, 6, 12, 15, 1.5, 2.5]);
      return t.pick([
        () => ({ q: `A printer prints ${num(k)} pages every minute. Write an equation for the number of pages, y, printed in x minutes.`, answer: `y = ${num(k)}x`,
          hint: 'Direct variation: y = (rate) · x.', steps: [`The rate is ${num(k)} pages per minute.`, `So y = ${num(k)}x.`] }),
        () => { const xs = [1, 2, 3, 4]; return { q: `y varies directly with x. x: ${list(xs)}. y: ${list(xs.map((x) => num(k * x)))}. Write the equation.`, answer: `y = ${num(k)}x`,
          hint: 'Find the rate m = y ÷ x, then write y = mx.', steps: [`m = y ÷ x = ${num(k * 2)} ÷ 2 = ${num(k)}.`, `y = ${num(k)}x.`] }; },
        () => { const m = t.pick([-3, -2, 2, 3, 4, -1]), a = t.int(1, 4); return { q: `A straight line goes through (0, 0) and (${a}, ${m * a}). What is its equation?`, answer: `y = ${m}x`,
          hint: 'For a line through the origin, m = y ÷ x for any other point on it.', steps: [`m = ${m * a} ÷ ${a} = ${m}.`, `y = ${m}x.`] }; },
      ])();
    } },
    'dv-solve': { label: 'Using direct variation', lesson: '5.4', make(t) {
      const m = t.pick([2, 3, 4, 5, 6, 1.5, 2.5, 0.5]), a = t.int(2, 6), c = t.int(3, 15);
      return { q: `y varies directly with x. When x = ${a}, y = ${num(m * a)}. Find y when x = ${c}.`, answer: num(m * c),
        hint: 'Find the rate m = y ÷ x first, then use y = mx.',
        steps: [`m = ${num(m * a)} ÷ ${a} = ${num(m)}.`, `y = ${num(m)} · ${c} = ${num(m * c)}.`] };
    } },
    'slope': { label: 'Slope of y = mx', lesson: '5.4', make(t) {
      const m = t.pick(['0.25', '0.5', '0.4', '0.75', '2', '-3', '1.5', '-0.2']);
      return { q: `What is the slope of y = ${m}x?`, answer: m,
        hint: 'In y = mx, the slope is the number multiplying x.',
        steps: [`y = mx means m is the slope.`, `Here m = ${m}${m.includes('.') ? ` (= ${frac(m)})` : ''}.`] };
    } },
    'dv-recognize': { label: 'Recognizing direct variation', lesson: '5.5', make(t) {
      const k = t.int(2, 9), b = t.int(1, 9);
      const [eq, yes, why] = t.pick([
        [`y = ${k}x`, true, `It has the form y = mx (m = ${k}).`],
        [`y = x/${k}`, true, `x/${k} is the same as (1/${k})x, so it has the form y = mx.`],
        [`y = ${k}x + ${b}`, false, `The + ${b} means the line crosses the y-axis at (0, ${b}), not at the origin.`],
        [`y = ${k}/x`, false, `x is on the bottom, so y is not a constant times x.`],
        [`y = x²`, false, `x is squared, so the graph is a curve, not a straight line through the origin.`],
        [`y = ${k}x − ${b}`, false, `The − ${b} moves the line off the origin.`],
      ]);
      return { q: `Is ${eq} a direct variation equation? Answer yes or no.`, choice: yes ? 'yes' : 'no',
        hint: 'Direct variation looks exactly like y = mx: no number added or subtracted, and x not on the bottom or squared.',
        steps: [`Direct variation must look like y = mx.`, why, `So the answer is ${yes ? 'yes' : 'no'}.`] };
    } },
  };

  // Which template fits a question, from its skill name in help.json (null = no generated practice, e.g. explain-why questions).
  const BY_SKILL = [
    [/experimental probability/i, 'exp-prob'], [/capture/i, 'capture'], [/predicting with probability/i, 'predict'],
    [/predicting from a sample/i, 'sample-predict'], [/sector/i, 'sector'], [/probability from a (histogram|pie)/i, 'data-prob'],
    [/no repeats|ordering without/i, 'no-repeat'], [/tree diagram|listing outcomes/i, 'count-outcomes'],
    [/repeats, then probability|independent|several events|probability of two events|two events, then/i, 'independent'],
    [/theoretical|one outcome|favorable|complement|certain|impossible|each color/i, 'theo-prob'],
    [/mean absolute deviation|comparing variability/i, 'mad'], [/interquartile|five-number/i, 'iqr'], [/mode, range/i, 'range'],
    [/median/i, 'median'], [/^mean$|finding the mean|comparing means/i, 'mean'],
    [/ordered pair|naming a point/i, 'ordered-pair'], [/rate from|graphs and rate/i, 'rate-table'],
    [/slope (from an equation|of y)/i, 'slope'], [/recogni|direct variation equations|direct variation from a table/i, 'dv-recognize'],
    [/equation from|writing (and using )?y = mx|direct variation equation from/i, 'dv-equation'],
    [/solving with|using a direct variation|missing value|input-output/i, 'dv-solve'],
  ];
  const kindFor = (skill) => BY_SKILL.find(([re]) => re.test(skill || ''))?.[1] || null;

  globalThis.Practice = {
    kinds: Object.fromEntries(Object.entries(K).map(([k, v]) => [k, { label: v.label, lesson: v.lesson }])),
    kindFor,
    make: (kind, seed = Math.floor(Math.random() * 2 ** 31)) => ({ kind, seed, ...K[kind].make(tools(rng(seed))) }),
    /** Is a typed answer right? true / false, or null when it can't be read. */
    check: (p, typed) => (p.choice ? (/^\s*(yes|no)\s*\.?\s*$/i.test(typed) ? typed.trim().toLowerCase().startsWith(p.choice) : null) : C().equivalent(typed, p.answer)),
  };
})();
