# Math review sources

Where the material behind `math/` (Core Focus on Proportions & Probability, SMC Curriculum) lives.

## Public

- Series page: https://www.corefocusonmath.com/?portfolio=stage-ii-proportions-probability
- Table of contents (PDF): https://www.corefocusonmath.com/wp-content/uploads/2013/09/PP-Table-of-Contents.pdf
  WebFetch returns it as unreadable binary, so download it and run `pdftotext -layout`.
- Sample Lesson 4.2 (PDF): https://www.corefocusonmath.com/wp-content/uploads/2013/09/PP-Lesson-4.2.pdf
- Sample summative assessments, Form A (PDF): https://corefocusonmath.com/wp-content/uploads/2013/08/Sample-Summative-Assessments.pdf

## Login required

- Core Focus classroom (Moodle): https://www.corefocusonmath.com/classrooms/
- Proportions & Probability course: https://www.corefocusonmath.com/classrooms/course/view.php?id=29
  Every lesson has a student text, slide show, video, worksheets (regular, Spanish, T and C) and an IXL link.
  Credentials are in `.env` as `BOOK_USER` and `BOOK_PASSWORD` (`.env` is gitignored, never commit it).
  To script it, POST to `/classrooms/login/index.php` with the page's `logintoken`, then follow the `mod/resource/view.php?id=…` links.
- Teacher site: https://mrsowensmath.weebly.com/ (password protected)
  Block 1 review, Form A (PDF): https://mrsowensmath.weebly.com/uploads/2/4/6/4/24642006/pp_block_1_-_review.pdf

## Block 4 ~ Probability & Random Sampling

Every lesson's classroom links (video, slides, student text, worksheet, IXL) are also in `math/lessons.json`, which the Help panel uses.

| Lesson | Title | Page | Student text |
|---|---|---|---|
| 4.1 | Probability | 110 | |
| 4.2 | Using Probability to Predict (capture/recapture) | 116 | |
| 4.3 | Probabilities and Data Displays | 122 | [text](https://www.corefocusonmath.com/classrooms/mod/resource/view.php?id=14557) |
| 4.4 | Compound Probabilities Using Lists, Tree Diagrams and Tables | 128 | [text](https://www.corefocusonmath.com/classrooms/mod/resource/view.php?id=14569) |
| 4.5 | Compound Probabilities Using Multiplication & Simulation | 135 | [text](https://www.corefocusonmath.com/classrooms/mod/resource/view.php?id=14581), [worksheet](https://www.corefocusonmath.com/classrooms/mod/resource/view.php?id=14584) |
| 4.6 | Random Sampling | 143 | |
| 4.7 | Inferences About a Population | 148 | |
| 4.8 | Measures of Center and Variability in Two Data Sets | 153 | |
| Review | Block 4 review | 162 | [text](https://www.corefocusonmath.com/classrooms/mod/resource/view.php?id=14640), [worksheet](https://www.corefocusonmath.com/classrooms/mod/resource/view.php?id=14642) |

### Where each question comes from

Each answer on the Block 4 forms starts with a lesson tag, shown only on the answer key and in "Show answers" mode. The tags are checked against the lesson PDFs. Forms B and C follow the same pattern; where Form D differs, it has its own column.

| Question | Forms B and C | Form D (if different) |
|---|---|---|
| I-1 experimental probability | 4.1 Ex. 2, p.112 | 4.1 Ex. 3, p.113 (as a percent) |
| I-2 expected count | 4.2 Ex. 2, p.118 | |
| I-3 pie chart | 4.3 Ex. 2, p.124 | 4.3 Ex. 1, p.123 (sector degrees) |
| I-4 list the outcomes | 4.4 Ex. 1, p.130 | 4.4 Ex. 2, p.131 (cards, no replacement) |
| I-5 two-event probabilities | 4.4 Ex. 3, p.131 | 4.5 Ex. 4, p.137 |
| I-6 1st/2nd(/3rd) place | 4.5 Ex. 3, p.136 | |
| I-7 lock code / simulation | 4.5 Ex. 2 and 5, pp.136–137 | 4.5 Explore! Simulation, p.138 |
| I-8 best / biased sample | 4.6 Ex. 1, p.144 | |
| I-9 weakest / strongest inference | 4.7 Ex. 2, p.149 | |
| I-10 | 4.8 Ex. 3, p.158 (MAD) | 4.8 Ex. 1, p.154 (median) |
| I-11 | 4.8 Ex. 1, p.154 (median) | 4.8 pp.154–156 (mode, range) |
| II-1 to 4 single-event probability, complement | 4.1 Ex. 1–2, pp.111–112 | 4.1 Ex. 1–3 (with percents) |
| II-5 | 4.1 Ex. 1, p.111 | 4.1 Ex. 3, p.113 (spinner) |
| II-6 capture/recapture | 4.2 Ex. 1, p.117 | |
| II-7 predict | 4.2 Ex. 2, p.118 | 4.7 Ex. 1, p.148 (election) |
| II-8 histogram | 4.3 Ex. 3, p.125 | |
| II-9 count with a tree/list/table | 4.4 Ex. 1, p.130 | |
| II-10 | 4.5 Ex. 5, p.137 (guess every answer) | 4.4 Ex. 2 and 4.5 Ex. 4 (with vs. without replacement) |
| II-11 | 4.5 Ex. 4, p.137 | 4.5 Explore! Simulation, p.138 |
| II-12 biased sample | 4.6 Ex. 1, p.144 | 4.6 Ex. 2, p.145 (systematic sample) |
| II-13 inferences from two samples | 4.7 Ex. 2, p.149 | |
| II-14 mean | 4.8 Ex. 1, p.153 | |
| II-15 median (and mode) | 4.8 Ex. 1, p.154 | |
| II-16 compare | 4.8 Ex. 1, pp.153–154 | |
| II-17 five-number summary | 4.8 Ex. 2, p.155 | |
| II-18 IQR (and range) | 4.8 Explore! Comparing Tests, p.156 | |
| II-19 MAD | 4.8 Ex. 3, p.158 | |
| II-20 compare variability | 4.8 pp.156–158 | |
| III | 4.5 Ex. 4, p.137 and 4.7 Ex. 1, p.148 | adds 4.3 Ex. 1, p.123 |

Related book practice:
- **I-6:** the common mistake (15 · 15 · 15) is Lesson 4.5 exercise #9, p.139. Block 4 Review #34, p.165, is the same type.
- **I-7:** Lesson 4.5 exercises #15–16, p.139 (ATM password), and Block 4 Review #38, p.166.

The tags were added by a one-off script that prefixes each `<div class="ans">`. To tag another block, add `<span class="src">Lesson x.y · Ex. n, p. N</span>` at the start of each answer.
