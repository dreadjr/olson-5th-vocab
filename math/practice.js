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
  // "-81/8" -> "-10 1/8" (whole numbers and proper fractions unchanged)
  const mixed = (f) => { const m = String(f).match(/^(-?)(\d+)\/(\d+)$/); if (!m || +m[2] < +m[3]) return String(f); const w = Math.floor(+m[2] / +m[3]), r = +m[2] % +m[3]; return `${m[1]}${w}${r ? ` ${r}/${m[3]}` : ''}`; };
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
    // ---- Block 1: Ratios and Rates (modeled on the class's P&P 1.x exit quizzes)
    'convert-units': { label: 'Converting measurements', lesson: '1.1', make(t) {
      const [from, to, f, n] = t.pick([['meters', 'centimeters', 100, t.int(2, 90)], ['kilometers', 'meters', 1000, t.int(2, 15)], ['kilograms', 'grams', 1000, t.int(2, 12)],
        ['liters', 'milliliters', 1000, t.int(2, 9)], ['minutes', 'hours', 1 / 60, 60 * t.int(2, 6)], ['tons', 'pounds', 2000, t.int(2, 9)], ['feet', 'inches', 12, t.int(2, 15)],
        ['yards', 'feet', 3, t.int(2, 40)], ['gallons', 'quarts', 4, t.int(2, 20)], ['pounds', 'ounces', 16, t.int(2, 12)], ['centimeters', 'meters', 1 / 100, 100 * t.int(2, 30)], ['inches', 'feet', 1 / 12, 12 * t.int(2, 10)]]);
      const a = num(n * f), big = f > 1;
      return { q: `${n} ${from} = ___ ${to}`, answer: a,
        hint: big ? `A ${from.replace(/s$/, '')} is bigger than a ${to.replace(/s$/, '')}, so you'll get more of them: multiply.` : `A ${from.replace(/s$/, '')} is smaller than a ${to.replace(/s$/, '')}, so you'll get fewer: divide.`,
        steps: [`1 ${from.replace(/s$/, '')} = ${num(big ? f : 1 / f)} ${big ? to : from}${big ? '' : ` per ${to.replace(/s$/, '')}`}.`, big ? `${n} · ${num(f)} = ${a}.` : `${n} ÷ ${num(1 / f)} = ${a}.`, `${n} ${from} = ${a} ${to}.`] };
    } },
    'frac-dec': { label: 'Fractions and decimals', lesson: '1.2', make(t) {
      if (t.int(0, 1)) {
        const d = t.pick([2, 4, 5, 8, 10, 20, 25]); let n; do n = t.int(1, d - 1); while (gcd(n, d) !== 1);
        const a = num(n / d);
        return { q: `Convert ${n}/${d} to a decimal.`, answer: a, form: 'decimal', hint: 'A fraction bar means divide: top ÷ bottom.', steps: [`${n}/${d} means ${n} ÷ ${d}.`, `${n} ÷ ${d} = ${a}.`] };
      }
      const d = t.pick([10, 100, 100, 1000]); let n; do n = t.int(1, d - 1); while (n % 10 === 0 || gcd(n, d) === 1 && d > 10 && t.int(0, 1));
      const g = gcd(n, d), dec = num(n / d), a = `${n / g}/${d / g}`;
      return { q: `Convert ${dec} to a fraction in simplest form.`, answer: a, form: 'fraction', hint: `Read it: ${dec} is ${n} ${d === 10 ? 'tenths' : d === 100 ? 'hundredths' : 'thousandths'}. Write that over ${d}, then simplify.`,
        steps: [`${dec} = ${n}/${d}.`, g > 1 ? `Divide top and bottom by ${g}: ${n}/${d} = ${a}.` : `${n} and ${d} share no factor, so it's already simplest.`] };
    } },
    'ratio-simplify': { label: 'Writing and simplifying ratios', lesson: '1.3', make(t) {
      if (t.int(0, 1)) {
        const g = t.int(2, 6); let a, b; do { a = t.int(1, 9); b = t.int(1, 9); } while (a === b || gcd(a, b) !== 1);
        return { q: `Simplify the ratio ${a * g} : ${b * g}.`, answer: `${a}:${b}`, form: 'ratio', hint: 'Divide both numbers by the biggest number that goes into both.',
          steps: [`${a * g} and ${b * g} are both divisible by ${g}.`, `${a * g} ÷ ${g} = ${a} and ${b * g} ÷ ${g} = ${b}, so the ratio is ${a} : ${b}.`] };
      }
      const N = t.pick([12, 15, 18, 20, 24, 30]), k = t.int(2, N - 2), [what, who] = t.pick([['wore headbands', 'soccer players'], ['brought lunch', 'students'], ['had a dog', 'friends'], ['chose art', 'campers']]);
      const which = t.int(0, 2), [x, y, label] = [[k, N, `who ${what} to all ${who}`], [N - k, N, `who did not ${what.replace(/^(wore|brought|had|chose)/, (m) => ({ wore: 'wear', brought: 'bring', had: 'have', chose: 'choose' })[m])} to all ${who}`], [k, N - k, `who ${what} to those who did not`]][which];
      const g = gcd(x, y);
      return { q: `${k} out of ${N} ${who} ${what}. Write the ratio of ${who} ${label}, in simplest form.`, answer: `${x / g}:${y / g}`, form: 'ratio',
        hint: 'Find each count first (the ones who did not = total − the ones who did), then simplify.', steps: [`The two counts are ${x} and ${y}.`, `${x} : ${y}${g > 1 ? ` = ${x / g} : ${y / g} (÷ ${g})` : ' is already simplest'}.`] };
    } },
    'unit-rate': { label: 'Unit rates', lesson: '1.4', make(t) {
      if (t.int(0, 2) === 0) {
        const [a, b] = [t.pick(['Thomas', 'Maya', 'Leo']), t.pick(['Dan', 'Ava', 'Zoe'])], item = t.pick(['ice cream cones', 'notebooks', 'smoothies']);
        let p1, p2, n1, n2; do { n1 = t.int(2, 5); n2 = t.int(2, 5); p1 = t.int(80, 250) / 100; p2 = t.int(80, 250) / 100; } while (n1 === n2 || Math.abs(p1 - p2) < 0.05);
        const who = p1 < p2 ? a : b;
        return { q: `${a} spent $${(p1 * n1).toFixed(2)} for ${n1} ${item}. ${b} spent $${(p2 * n2).toFixed(2)} for ${n2} ${item}. Who spent less per item?`, choice: who.toLowerCase(), options: [a.toLowerCase(), b.toLowerCase()],
          hint: 'Find each unit rate: dollars ÷ items.', steps: [`${a}: $${(p1 * n1).toFixed(2)} ÷ ${n1} = $${p1.toFixed(2)} each.`, `${b}: $${(p2 * n2).toFixed(2)} ÷ ${n2} = $${p2.toFixed(2)} each.`, `${who} spent less per item.`] };
      }
      const [top, bottom, per] = t.pick([['miles', 'hours', 'miles per hour'], ['dollars', 'pounds', 'dollars per pound'], ['words', 'minutes', 'words per minute'], ['pages', 'days', 'pages per day']]);
      const b = t.int(2, 8), r = top === 'dollars' ? t.int(105, 950) / 100 : t.int(4, 60), a = num(r * b);
      return { q: `Find the unit rate: ${a} ${top} in ${b} ${bottom}.`, answer: num(r), hint: `A unit rate is "per 1": divide ${top} by ${bottom}.`,
        steps: [`${a} ${top} / ${b} ${bottom}.`, `${a} ÷ ${b} = ${num(r)}, so ${num(r)} ${per}.`] };
    } },
    'rate-convert': { label: 'Converting rates', lesson: '1.5', make(t) {
      return t.pick([
        () => { const s = t.int(2, 30), v = s * 60; return { q: `Convert ${v} feet per minute to feet per second.`, answer: String(s), hint: '1 minute = 60 seconds. Divide by 60 to go from per minute to per second.', steps: [`${v} ft / 1 min · 1 min / 60 s.`, `${v} ÷ 60 = ${s} feet per second.`] }; },
        () => { const h = t.pick([15, 30, 45, 60, 75]), fs = num((h * 5280) / 3600); return { q: `Convert ${h} miles per hour to feet per second.`, answer: fs, hint: 'Use two conversion factors: 1 mile = 5,280 feet and 1 hour = 3,600 seconds.', steps: [`${h} mi / 1 h · 5280 ft / 1 mi · 1 h / 3600 s.`, `${h} · 5280 = ${h * 5280}; ÷ 3600 = ${fs} feet per second.`] }; },
        () => { const c = t.int(2, 12), m = c * 60; return { q: `A faucet drips ${c} cups per minute. How many cups is that per hour?`, answer: String(m), hint: '1 hour = 60 minutes: multiply.', steps: [`${c} cups / 1 min · 60 min / 1 h.`, `${c} · 60 = ${m} cups per hour.`] }; },
      ])();
    } },
    'complex-fraction': { label: 'Complex fractions and rates', lesson: '1.6', make(t) {
      const fr = () => { let n, d; do { n = t.int(1, 9); d = t.int(2, 12); } while (gcd(n, d) !== 1 || n >= d); return [n, d]; };
      if (t.int(0, 1)) {
        const [a, b] = fr(), [c, d] = fr(), ans = frac(`(${a}/${b})/(${c}/${d})`);
        return { q: `Simplify (${a}/${b}) ÷ (${c}/${d}).`, answer: ans, hint: 'Dividing by a fraction is multiplying by its flip (reciprocal).', steps: [`(${a}/${b}) ÷ (${c}/${d}) = ${a}/${b} · ${d}/${c}.`, `= ${a * d}/${b * c} = ${mixed(ans)}.`] };
      }
      const w = t.int(1, 9), [n, d] = fr(), mins = t.int(2, 9), tot = `${w} ${n}/${d}`, ans = frac(`(${w}+${n}/${d})/${mins}`);
      return { q: `Rita swam ${tot} laps in ${mins} minutes. How many laps per minute is that?`, answer: ans, hint: 'Laps ÷ minutes. Change the mixed number to an improper fraction first.',
        steps: [`${tot} = ${w * d + n}/${d}.`, `${w * d + n}/${d} ÷ ${mins} = ${w * d + n}/${d * mins}.`, `= ${mixed(ans)} laps per minute.`] };
    } },
    // ---- Block 2: Proportions and Similarity
    'is-proportion': { label: 'Do the ratios form a proportion?', lesson: '2.1', make(t) {
      const a = t.int(2, 9), b = t.int(a + 1, 15), k = t.int(2, 4), yes = t.int(0, 1) === 1, c = a * k, d = yes ? b * k : b * k + t.pick([-2, -1, 1, 2]);
      return { q: `Do ${a}/${b} and ${c}/${d} form a proportion? Answer yes or no.`, choice: yes ? 'yes' : 'no', hint: 'Cross-multiply: the two products are equal only for a proportion.',
        steps: [`${a} · ${d} = ${a * d} and ${b} · ${c} = ${b * c}.`, yes ? 'They are equal, so yes.' : 'They are not equal, so no.'] };
    } },
    'solve-proportion': { label: 'Solving proportions', lesson: '2.1', make(t) {
      const a = t.int(2, 9), b = t.int(2, 12), k = t.pick([2, 3, 4, 5, 1.5, 0.5]), c = num(b * k), y = num(a * k);
      return { q: `Solve the proportion ${a}/${b} = y/${c}.`, answer: y, hint: 'Cross-multiply, then divide.', steps: [`${b} · y = ${a} · ${c} = ${num(a * b * k)}.`, `y = ${num(a * b * k)} ÷ ${b} = ${y}.`] };
    } },
    'proportion-story': { label: 'Problem solving with proportions', lesson: '2.2', make(t) {
      return t.pick([
        () => { const h = t.int(2, 5), r = t.int(5, 15), H = t.int(h + 1, 9), m = r * H; return { q: `Victor rode his bike ${r * h} miles in ${h} hours. At the same speed, how far does he ride in ${H} hours?`, answer: String(m), hint: 'Set up miles/hours = miles/hours with the unknown, then cross-multiply.', steps: [`${r * h}/${h} = x/${H}.`, `${h} · x = ${r * h} · ${H} = ${r * h * H}.`, `x = ${m} miles.`] }; },
        () => { const n = t.int(3, 8), p = t.int(60, 250) / 100, N = t.int(n + 2, 15), c = num(p * N); return { q: `It costs $${(p * n).toFixed(2)} for ${n} candy bars. How much do ${N} candy bars cost?`, answer: c, hint: 'dollars/bars = dollars/bars. Cross-multiply.', steps: [`${(p * n).toFixed(2)}/${n} = x/${N}.`, `x = ${(p * n).toFixed(2)} · ${N} ÷ ${n}.`, `x = $${Number(c).toFixed(2)}.`] }; },
      ])();
    } },
    'scale-factor': { label: 'Scale factor of similar figures', lesson: '2.3', make(t) {
      let a, b; do { a = t.int(1, 7); b = t.int(1, 7); } while (a === b || gcd(a, b) !== 1);
      const s = t.int(2, 5), [w, h] = [t.int(2, 6), t.int(3, 9)], shape = t.pick(['rectangle', 'triangle', 'trapezoid']);
      return { q: `${shape[0].toUpperCase() + shape.slice(1)} A has a side of ${w * a * s / gcd(w * a * s, 1)} cm. The matching side of similar ${shape} B is ${w * b * s} cm. What is the scale factor from A to B? Write it as a ratio in simplest form.`,
        answer: `${a}:${b}`, form: 'ratio', hint: 'Compare matching sides: A : B, then simplify.', steps: [`A : B = ${w * a * s} : ${w * b * s}.`, `Divide both by ${w * s}: ${a} : ${b}.`] };
    } },
    'similar-missing': { label: 'Missing side in similar figures', lesson: '2.4', make(t) {
      const k = t.pick([2, 3, 4, 1.5, 2.5]), a = t.int(2, 9), b = t.int(2, 9), A = num(a * k), B = num(b * k);
      return { q: `Two triangles are similar. The small one has sides ${a} m and ${b} m. In the big one, the side matching ${a} m is ${A} m. How long is the side matching ${b} m?`, answer: B,
        hint: 'Write small/big = small/big with x for the missing side, then cross-multiply.', steps: [`${a}/${A} = ${b}/x.`, `${a} · x = ${A} · ${b} = ${num(Number(A) * b)}.`, `x = ${B} m.`] };
    } },
    'perimeter-area-ratio': { label: 'Perimeter and area of similar figures', lesson: '2.5', make(t) {
      let a, b; do { a = t.int(1, 5); b = t.int(2, 7); } while (a >= b || gcd(a, b) !== 1);
      const p = t.int(2, 6) * a, P = (p / a) * b;
      return t.pick([
        () => ({ q: `Two similar triangles have perimeters of ${p} m and ${P} m. What is the ratio of their areas (small : big)?`, answer: `${a * a}:${b * b}`, form: 'ratio', hint: 'The perimeters give the scale factor. Areas grow by the scale factor squared.', steps: [`Scale factor = ${p} : ${P} = ${a} : ${b}.`, `Area ratio = ${a}² : ${b}² = ${a * a} : ${b * b}.`] }),
        () => { const A = t.int(2, 6) * b * b; return { q: `Two similar hexagons have a scale factor of ${a} : ${b}. The larger one has an area of ${A} m². What is the area of the smaller one?`, answer: num((A * a * a) / (b * b)), hint: 'The area ratio is the scale factor squared.', steps: [`Area ratio = ${a * a} : ${b * b}.`, `${a * a}/${b * b} = x/${A}.`, `x = ${A} · ${a * a} ÷ ${b * b} = ${num((A * a * a) / (b * b))} m².`] }; },
      ])();
    } },
    'scale-drawing': { label: 'Scale drawings and maps', lesson: '2.6', make(t) {
      return t.pick([
        () => { const i = t.int(1, 3), m = t.int(2, 10), d = i * t.int(2, 8), a = num((d / i) * m); return { q: `A map has a scale of ${i} inch${i > 1 ? 'es' : ''} : ${m} miles. Two towns are ${d} inches apart on the map. How far apart are they really, in miles?`, answer: a, hint: 'map/actual = map/actual. Cross-multiply.', steps: [`${i}/${m} = ${d}/x.`, `${i} · x = ${m} · ${d} = ${m * d}.`, `x = ${a} miles.`] }; },
        () => { const s = t.pick([12, 18, 24, 36]), l = t.int(2, 8), inches = s * l, feet = inches % 12 === 0; return { q: `A model car has a scale of 1 : ${s}. The model is ${l} inches long. How long is the real car${feet ? ', in feet' : ', in inches'}?`, answer: String(feet ? inches / 12 : inches), hint: 'Each model inch stands for ' + s + ' real inches.' + (feet ? ' Then change inches to feet (÷ 12).' : ''), steps: [`1 model inch = ${s} real inches, so multiply: ${l} · ${s} = ${inches} inches.`, feet ? `${inches} ÷ 12 = ${inches / 12} feet.` : `The real car is ${inches} inches long.`] }; },
      ])();
    } },
    // ---- Block 3: Percents
    'fdp': { label: 'Fractions, decimals and percents', lesson: '3.1', make(t) {
      const [n, d] = t.pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 8], [3, 8], [5, 8], [7, 8], [1, 10], [3, 10], [7, 20], [9, 25], [3, 50]]);
      const pct = num((n / d) * 100);
      return t.pick([
        () => ({ q: `Write ${n}/${d} as a percent.`, answer: `${pct}%`, hint: 'Divide top by bottom to get a decimal, then move the decimal point 2 places right.', steps: [`${n} ÷ ${d} = ${num(n / d)}.`, `${num(n / d)} = ${pct}%.`] }),
        () => ({ q: `Write ${pct}% as a fraction in simplest form.`, answer: `${n}/${d}`, form: 'fraction', hint: 'Percent means "out of 100": put it over 100 and simplify.', steps: [`${pct}% = ${pct}/100.`, `Simplify: ${n}/${d}.`] }),
        () => ({ q: `Write ${pct}% as a decimal.`, answer: num(n / d), form: 'decimal', hint: 'Move the decimal point 2 places left.', steps: [`Percent means out of 100, so divide by 100.`, `${pct}% = ${pct} ÷ 100 = ${num(n / d)}.`] }),
      ])();
    } },
    'percent-of': { label: 'Solving percent problems', lesson: '3.2', make(t) {
      const p = t.pick([10, 20, 25, 30, 40, 50, 75, 120, 130, 150, 5, 15]), w = t.pick([20, 40, 60, 80, 120, 200, 64, 48]), part = num((p / 100) * w);
      return t.pick([
        () => ({ q: `What is ${p}% of ${w}?`, answer: part, hint: `Change ${p}% to a decimal and multiply.`, steps: [`${p}% = ${num(p / 100)}.`, `${num(p / 100)} · ${w} = ${part}.`] }),
        () => ({ q: `What percent of ${w} is ${part}?`, answer: `${p}%`, hint: 'part ÷ whole, then change to a percent.', steps: [`${part} ÷ ${w} = ${num(p / 100)}.`, `${num(p / 100)} = ${p}%.`] }),
        () => ({ q: `${part} is ${p}% of what number?`, answer: String(w), hint: `Write ${part} = ${num(p / 100)} · x and divide.`, steps: [`${part} = ${num(p / 100)} · x.`, `x = ${part} ÷ ${num(p / 100)} = ${w}.`] }),
      ])();
    } },
    'percent-change': { label: 'Percent of change', lesson: '3.4', make(t) {
      const o = t.pick([20, 40, 50, 60, 80, 120, 200, 250]), p = t.pick([10, 20, 25, 30, 40, 50, 75]), up = t.int(0, 1) === 1, n = num(up ? o * (1 + p / 100) : o * (1 - p / 100));
      return { q: `A price changes from $${o} to $${n}. Is it an increase or a decrease, and by what percent? (Answer like "increase 10%".)`, answer: `${p}%`, word: up ? 'increase' : 'decrease', options: ['increase', 'decrease'],
        hint: 'Percent of change = amount of change ÷ original amount.', steps: [`Change: ${n} − ${o} = ${num(Number(n) - o)}, so it's ${up ? 'an increase' : 'a decrease'}.`, `${num(Math.abs(Number(n) - o))} ÷ ${o} = ${num(p / 100)} = ${p}%.`] };
    } },
    'discount-markup': { label: 'Discounts, markups, tax and tips', lesson: '3.5', make(t) {
      const price = t.pick([12, 16, 20, 24, 30, 40, 45, 60, 80]), p = t.pick([10, 15, 20, 25, 30, 40]);
      const [what, sign] = t.pick([['discount', -1], ['markup', 1], ['sales tax', 1], ['tip', 1]]), sell = (price * (100 + sign * p)) / 100, money = sell.toFixed(2);
      return { q: `The original price is $${price}.00. The ${what} is ${p}%. What is the ${what === 'tip' ? 'total with the tip' : what === 'sales tax' ? 'total with tax' : 'selling price'}?`, answer: num(sell),
        hint: `Find ${p}% of $${price}, then ${sign < 0 ? 'subtract it' : 'add it'}.`, steps: [`${p}% of ${price} = ${num(p / 100)} · ${price} = ${num((p / 100) * price)}.`, `${price} ${sign < 0 ? '−' : '+'} ${num((p / 100) * price)} = $${money}.`] };
    } },
    // ---- Rational Numbers & Equations (Quinn's class unit before P&P): RNE exit quizzes
    'int-add': { label: 'Adding and subtracting integers', lesson: 'RNE 2', make(t) {
      const a = t.int(-20, 20), b = t.int(-20, 20) || 3, op = t.pick(['+', '−']), r = op === '+' ? a + b : a - b, show = (x) => (x < 0 ? `(${x})` : String(x));
      return { q: `Find the value: ${a} ${op} ${show(b)} = ?`, answer: String(r), hint: op === '−' ? 'Subtracting is adding the opposite: change − to + and flip the sign of the second number.' : 'Same signs: add and keep the sign. Different signs: subtract and keep the sign of the bigger number.',
        steps: [op === '−' ? `${a} − ${show(b)} = ${a} + ${show(-b)}.` : `${a} + ${show(b)}.`, `= ${r}.`] };
    } },
    'mult-rational': { label: 'Multiplying rational numbers', lesson: 'RNE 3.5', make(t) {
      const decimals = () => { // decimals: the place value is the hard part (the class's exit quizzes: 1.2 for −0.6 · −0.2)
          const a = t.int(1, 9) * t.pick([-1, 1]), b = t.int(1, 9) * t.pick([-1, 1]), pa = t.pick([1, 1, 2]), pb = t.pick([1, 1, 0]);
          const A = num(a / 10 ** pa), B = num(b / 10 ** pb), r = num((a * b) / 10 ** (pa + pb)), show = (x) => (Number(x) < 0 ? `(${x})` : x);
          return { q: `${A} · ${show(B)} = ?`, answer: r, form: 'decimal', hint: `Multiply as whole numbers (${Math.abs(a)} · ${Math.abs(b)} = ${Math.abs(a * b)}), then count decimal places: ${pa} + ${pb} = ${pa + pb}. ${a < 0 && b < 0 ? 'Negative · negative is positive.' : a < 0 || b < 0 ? 'One negative makes the answer negative.' : ''}`.trim(),
            steps: [`Ignore the decimal points: ${Math.abs(a)} · ${Math.abs(b)} = ${Math.abs(a * b)}.`, `${A} has ${pa} decimal place${pa > 1 ? 's' : ''} and ${B} has ${pb}: the answer has ${pa + pb}.`, `Sign: ${(a < 0) === (b < 0) ? 'same signs, positive' : 'different signs, negative'}. Answer: ${r}.`] };
        };
      return t.pick([decimals, decimals,
        () => { const f = () => { let n, d; do { n = t.int(1, 8); d = t.int(2, 12); } while (gcd(n, d) !== 1 || n >= d); return [n * t.pick([-1, 1]), d]; }; const [a, b] = f(), [c, d] = f(), r = frac(`(${a}/${b})*(${c}/${d})`);
          return { q: `(${a}/${b}) · (${c}/${d}) = ?`, answer: r, hint: 'Multiply tops, multiply bottoms, simplify. Watch the sign.', steps: [`${a} · ${c} = ${a * c} and ${b} · ${d} = ${b * d}.`, `${a * c}/${b * d} = ${r}.`] }; },
        () => { const w = t.int(1, 4), d = t.pick([3, 5, 7, 8]), n = t.int(1, d - 1), c = t.int(1, 5) * t.pick([-1, 1]), e = t.pick([2, 3, 4, 5]); const r = frac(`-(${w}+${n}/${d})*(${c}/${e})`);
          return { q: `−${w} ${n}/${d} · (${c}/${e}) = ? (You may answer as a mixed number.)`, answer: r, hint: 'Change the mixed number to an improper fraction first, then multiply and simplify.', steps: [`−${w} ${n}/${d} = −${w * d + n}/${d}.`, `−${w * d + n}/${d} · ${c}/${e} = ${-(w * d + n) * c}/${d * e}.`, `= ${mixed(r)}.`] }; },
      ])();
    } },
    'div-rational': { label: 'Dividing rational numbers', lesson: 'RNE 3.6', make(t) {
      const decimals = () => { const q = t.int(2, 40) * t.pick([-1, 1]) * t.pick([1, 10]), b = t.pick([0.1, 0.2, 0.4, 0.5, 4, 5, 2]) * t.pick([-1, 1]), a = num(q * b), show = (x) => (x < 0 ? `(${num(x)})` : num(x));
          return { q: `${a} ÷ ${show(b)} = ?`, answer: num(q), form: 'decimal', hint: `Move the decimal point in both numbers until you divide by a whole number. Different signs make a negative.`,
            steps: [Math.abs(b) < 1 ? `Multiply both by 10: ${num(Number(a) * 10)} ÷ ${num(b * 10)}.` : `Divide ${num(Math.abs(Number(a)))} by ${num(Math.abs(b))}.`, `= ${num(Math.abs(q))}, and the sign is ${(Number(a) < 0) === (b < 0) ? 'positive' : 'negative'}: ${num(q)}.`] }; };
      return t.pick([decimals, decimals,
        () => { const f = () => { let n, d; do { n = t.int(1, 8); d = t.int(2, 9); } while (gcd(n, d) !== 1 || n >= d); return [n * t.pick([-1, 1]), d]; }; const [a, b] = f(), [c, d] = f(), r = frac(`(${a}/${b})/(${c}/${d})`);
          return { q: `(${a}/${b}) ÷ (${c}/${d}) = ?`, answer: r, hint: 'Keep, change, flip: keep the first fraction, change ÷ to ·, flip the second.', steps: [`(${a}/${b}) · (${d}/${c}).`, `= ${a * d}/${b * c} = ${mixed(r)}.`] }; },
      ])();
    } },
    'distribute': { label: 'The distributive property', lesson: 'RNE 4.4', make(t) {
      const a = t.int(2, 9) * t.pick([-1, 1]), b = t.int(1, 9), c = t.int(1, 12) * t.pick([-1, 1]), sgn = (x) => (x < 0 ? `− ${-x}` : `+ ${x}`);
      if (t.int(0, 1)) return { q: `Use the distributive property to simplify ${a}(${b}x ${sgn(c)}).`, answer: `${a * b}x ${sgn(a * c)}`, form: 'expr',
        hint: `Multiply ${a} by each term inside: ${a} · ${b}x and ${a} · ${c}.`, steps: [`${a} · ${b}x = ${a * b}x.`, `${a} · ${c} = ${a * c}.`, `${a}(${b}x ${sgn(c)}) = ${a * b}x ${sgn(a * c)}.`] };
      const x = t.int(-6, 9), k = t.int(2, 8), m = t.int(1, 9), rhs = k * (x - m);
      return { q: `Solve: ${k}(x − ${m}) = ${rhs}`, answer: String(x), hint: `Distribute first (${k}x − ${k * m}), then undo the subtraction and the multiplication.`, steps: [`${k}x − ${k * m} = ${rhs}.`, `${k}x = ${rhs + k * m}.`, `x = ${x}. Check: ${k}(${x} − ${m}) = ${rhs} ✓`] };
    } },
    'solve-multi': { label: 'Simplifying and solving equations', lesson: 'RNE 4.6', make(t) {
      return t.pick([
        () => { const x = t.int(-5, 12), a = t.int(2, 6), b = t.int(1, 6), c = t.int(1, 15), r = a * (x - b) + c; return { q: `Solve: ${a}(x − ${b}) + ${c} = ${r}`, answer: String(x), hint: 'Distribute, combine like terms, then solve.', steps: [`${a}x − ${a * b} + ${c} = ${r}.`, `${a}x ${(c - a * b) < 0 ? '−' : '+'} ${Math.abs(c - a * b)} = ${r}, so ${a}x = ${r - c + a * b}.`, `x = ${x}.`] }; },
        () => { const y = t.int(-4, 8), a = t.int(1, 5), b = t.int(1, 4), c = t.int(2, 9), k = t.int(1, 12), r = (a + b + c) * y + k; return { q: `Solve: ${a}y + ${k} + ${b}y + ${c}y = ${r}`, answer: String(y), hint: 'Combine the y terms first.', steps: [`${a}y + ${b}y + ${c}y = ${a + b + c}y, so ${a + b + c}y + ${k} = ${r}.`, `${a + b + c}y = ${r - k}.`, `y = ${y}.`] }; },
      ])();
    } },
    'solve-both': { label: 'Variables on both sides', lesson: 'RNE 4.7', make(t) {
      const x = t.int(-6, 10), a = t.int(3, 9), c = t.int(1, a - 1), b = t.int(-12, 15), d = (a - c) * x + b;
      const sgn = (v) => (v < 0 ? `− ${-v}` : `+ ${v}`);
      return { q: `Solve: ${a}x ${sgn(b)} = ${c}x ${sgn(d)}`, answer: String(x), hint: `Get the x terms on one side: subtract ${c}x from both sides.`, steps: [`${a}x − ${c}x ${sgn(b)} = ${d}, so ${a - c}x ${sgn(b)} = ${d}.`, `${a - c}x = ${d - b}.`, `x = ${x}. Check: ${a}(${x}) ${sgn(b)} = ${a * x + b} and ${c}(${x}) ${sgn(d)} = ${c * x + d} ✓`] };
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

  // Answers as people write them: "x = 9", "$12.50", "3,000 feet", "-10 1/8", "25%", ratios "3 : 2" / "3 to 2",
  // expressions "3x - 15", "increase 25%". p.form: 'ratio' (simplest form), 'fraction' / 'decimal' (that form), 'expr'.
  const toExpr = (s) => s.replace(/^\s*(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)\s*$/, '$1($2+$3/$4)');
  const tidy = (s) => s.trim().replace(/[−–]/g, '-').replace(/^[a-z]\s*=\s*/i, '').replace(/\$/g, '').replace(/(\d),(?=\d{3}\b)/g, '$1')
    .replace(/\s*(?:[a-z²]+\.?\s*)+$/i, '').replace(/\.$/, '').trim();
  const ratio = (s) => { const m = s.trim().replace(/[−–]/g, '-').match(/^(-?\d+(?:\.\d+)?)\s*(?::|to|\/)\s*(-?\d+(?:\.\d+)?)$/i); return m && [+m[1], +m[2]]; };
  function check(p, typed) {
    if (!String(typed ?? '').trim()) return null;
    if (p.choice) {
      const opts = p.options || ['yes', 'no'], said = opts.filter((o) => new RegExp(`\\b${o}\\b`, 'i').test(typed));
      return said.length === 1 ? said[0] === p.choice : null;
    }
    if (p.word) {
      const said = p.options.filter((o) => new RegExp(`\\b${o}\\b`, 'i').test(typed));
      if (said.length !== 1) return null;
      if (said[0] !== p.word) return false;
      typed = typed.replace(new RegExp(p.options.join('|'), 'ig'), '').replace(/^[\s;:,]+|\b(by|of)\b/gi, '');
    }
    if (p.form === 'ratio') {
      const got = ratio(typed), [a, b] = ratio(p.answer);
      if (!got) return null;
      return got[0] * b === got[1] * a && gcd(got[0], got[1]) === 1; // simplest form, as the question asks
    }
    if (p.form === 'expr') { // compare as functions of x at a few values
      const at = (e, x) => C().evalLines(e.replace(/[−–]/g, '-').replace(/(\d)\s*x/g, '$1*x').replace(/x/g, `(${x})`))[0];
      let ok = true;
      for (const x of [2, 5, -3]) { const g = at(typed, x), w = at(p.answer, x); if (!g || g.error || g.text == null || /error/i.test(g.text)) return null; if (C().equivalent(g.text, w.text) !== true) ok = false; }
      return ok;
    }
    if (!p.form && !/[%$]/.test(typed + p.answer)) { const raw = C().equivalent(typed, p.answer); if (raw != null) return raw; } // y = 3x, (2, -5), 3/10 …
    const pct = /%\s*$/.test(p.answer);
    let t = tidy(typed);
    if (pct) t = t.replace(/%$/, '');
    if (p.form === 'fraction' && !/\//.test(t)) return null; // asked for a fraction
    if (p.form === 'decimal' && /\//.test(t)) return null; // asked for a decimal
    return C().equivalent(toExpr(t), toExpr(p.answer.replace(/%$/, '')));
  }

  globalThis.Practice = {
    kinds: Object.fromEntries(Object.entries(K).map(([k, v]) => [k, { label: v.label, lesson: v.lesson }])),
    kindFor,
    make: (kind, seed = Math.floor(Math.random() * 2 ** 31)) => ({ kind, seed, ...K[kind].make(tools(rng(seed))) }),
    /** Is a typed answer right? true / false, or null when it can't be read. */
    check,
  };
})();
