// Exit quiz reviews: the shape of each of the class's exit quizzes (Pre-Algebra 2, Schoology), as practice templates
// in the quiz's order, so a review asks the same kinds of questions with new numbers. Only the question types are
// here, not anyone's answers or scores (those stay in data/, local). [kind, variant] picks a template's problem type
// (see math/practice.js: e.g. mult-rational 0 = decimals, 2 = fractions, 3 = mixed numbers).
// Questions that can't be generated (naming parts of a picture, writing an explanation) are left out.
globalThis.QuizReviews = [
  { id: 'rne-2', group: 'rne', title: 'RNE Block 2 Add and Subtract Integers Quiz', items: [['int-add'], ['int-add'], ['int-add'], ['int-add']] },
  { id: 'rne-3.5', group: 'rne', title: 'Multiply RN / RNE 3.5 Exit Quiz', items: [['mult-rational', 0], ['mult-rational', 2], ['mult-rational', 3], ['mult-rational', 0]] },
  { id: 'rne-3.6', group: 'rne', title: 'Divide RN / RNE 3.6 Exit Quiz', items: [['div-rational', 2], ['div-rational', 0], ['div-rational', 2], ['div-rational', 0]] },
  { id: 'rne-4.4', group: 'rne', title: '4.4 Exit Quiz (Distributive Property)', items: [['distribute'], ['distribute'], ['distribute'], ['distribute']] },
  { id: 'rne-4.6', group: 'rne', title: 'RNE 4.6 Exit Quiz', items: [['solve-multi', 0], ['solve-multi', 1], ['solve-multi', 0]] },
  { id: 'rne-4.7', group: 'rne', title: 'RNE 4.7 Exit Quiz', items: [['solve-both'], ['solve-both'], ['solve-both']] },
  { id: '1.1', group: '1', title: 'P&P 1.1 Exit Quiz', items: [['convert-units'], ['convert-units'], ['convert-units']] },
  { id: '1.2', group: '1', title: 'P&P 1.2 Exit Quiz', items: [['frac-dec'], ['frac-dec'], ['frac-dec'], ['frac-dec']] },
  { id: '1.3', group: '1', title: 'P&P 1.3 Ratios Exit Quiz', items: [['ratio-simplify'], ['ratio-simplify'], ['ratio-simplify'], ['ratio-simplify']] },
  { id: '1.4', group: '1', title: 'P&P 1.4 Exit Quiz', items: [['unit-rate'], ['unit-rate'], ['unit-rate']] },
  { id: '1.5', group: '1', title: 'P&P 1.5 Exit Quiz', items: [['rate-convert', 0], ['rate-convert', 1]] },
  { id: '1.6', group: '1', title: 'P&P 1.6 Exit Quiz', items: [['complex-fraction'], ['complex-fraction'], ['complex-fraction']] },
  { id: '2.1', group: '2', title: 'PP 2.1 Exit Quiz', items: [['is-proportion'], ['is-proportion'], ['solve-proportion'], ['solve-proportion']] },
  { id: '2.2', group: '2', title: 'PP 2.2 Exit Quiz', items: [['proportion-story', 0], ['proportion-story', 1]] },
  { id: '2.3', group: '2', title: 'PP 2.3 Exit Quiz', items: [['scale-factor'], ['scale-factor']] },
  { id: '2.4', group: '2', title: 'PP 2.4 Exit Quiz', items: [['scale-factor'], ['scale-factor'], ['similar-missing'], ['similar-missing']] },
  { id: '2.5', group: '2', title: 'PP 2.5 Exit Quiz', items: [['perimeter-area-ratio', 0], ['perimeter-area-ratio', 0], ['perimeter-area-ratio', 1]] },
  { id: '2.6', group: '2', title: 'PP 2.6 Exit Quiz', items: [['scale-drawing', 0], ['scale-drawing', 0], ['scale-drawing', 1], ['scale-drawing', 1]] },
  { id: '3.1', group: '3', title: 'P&P 3.1 Exit Quiz', items: [['fdp', 0], ['fdp', 1], ['fdp', 2], ['fdp', 0]] },
  { id: '3.2', group: '3', title: 'P&P 3.2 Exit Quiz', items: [['percent-of', 0], ['percent-of', 1], ['percent-of', 2]] },
  { id: '3.3', group: '3', title: 'PP 3.3 Exit Quiz', items: [['percent-of', 2], ['percent-of', 0], ['percent-of', 1]] },
  { id: '3.4', group: '3', title: 'P&P 3.4 Exit Quiz', items: [['percent-change'], ['percent-change'], ['percent-change']] },
  { id: '3.5', group: '3', title: 'P&P 3.5 Exit Quiz', items: [['discount-markup'], ['discount-markup'], ['discount-markup']] },
  { id: '4.1', group: '4', title: 'PP 4.1 Exit Quiz', items: [['theo-prob'], ['theo-prob'], ['theo-prob'], ['exp-prob']] },
  { id: '4.2', group: '4', title: 'P&P 4.2 Exit Quiz', items: [['capture'], ['predict']] },
  { id: '4.3', group: '4', title: 'P&P 4.3 Exit Quiz', items: [['sector'], ['sector'], ['sector'], ['data-prob']] },
  { id: '4.6-4.7', group: '4', title: 'P&P 4.6 & 4.7 Exit Quiz', items: [['sample-predict'], ['sample-predict']] },
  { id: '4.8', group: '4', title: 'PP 4.8 Exit Ticket', items: [['mean'], ['median'], ['range'], ['iqr']] },
];
