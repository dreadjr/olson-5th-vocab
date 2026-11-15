# Math review Help button + local AI tutor: design

Approved 2026-11-15. Short design (small project).

## Intent

My kid gets stuck on review questions (Block 4 Form C #6, #7, #9…) and needs help that teaches the idea instead of handing over the answer. Help should explain in plain words, point back to the exact textbook lesson, and link to the lesson's classroom resources (video, slides, student text, worksheet, IXL); the kid has a classroom login. It is the first step toward graded, saved, adaptive practice (like i-Ready, AI-first) that stays generic enough for other subjects.

## Goals

- A **Help** button on every question of the web version of a review form (not on the printed PDFs).
- Hints go in a fixed order: (1) a nudge toward the key idea, (2) a similar worked example with different numbers, in the book's style, (3) a walkthrough of this exact problem. Steps unlock in order.
- The lesson tag and classroom links are visible at every step.
- After seeing a hint, the kid can type a question ("I got 81, why is that wrong?") and get a tutor reply from my own AI CLI.
- Every hint opened and every question asked is logged locally: the seed for the grader.

## Non-goals (for now)

Grading, generating new questions, sign-in, class-wide use, a cloud server, Blocks other than 4.

## Anti-goals

- Help that just gives the answer at step 1.
- Hints that are wrong. Written-ahead hints are checked against the answer key.
- Publishing book content. Help paraphrases the book and links to it behind the classroom login, and never copies pages.

## Constraints

- The site is static files on Firebase Hosting (kok-5th.web.app) and GitHub Pages, with no server. It must keep working that way.
- No new dependencies; scripts run with bun.
- Only for my kid for now, on the home network. My AI CLIs (`claude`, optionally `codex`) are the AI. No API keys.
- Classroom links (corefocusonmath.com/classrooms, course id 29) need a login; the per-lesson resource IDs are in docs/math-sources.md.

## Approaches considered

1. **Hints written ahead of time + live AI only when typing** (chosen). Instant, free, offline, and correct for the three steps; AI only for follow-ups.
2. Everything live. Each tap is slow and costs money, and the hints are unchecked and can give away the answer.
3. No AI on the site (a copy-to-ChatGPT button). Fails the goal of an in-house tutor and of seeing what the kid struggled with.

Server location: first proposed Firebase Functions (needs the Blaze plan) or a Cloudflare Worker. **Chosen instead: a local server on my Mac using my AI CLIs**, since it's only for my kid.

## Design

- **`help.json` per form** (e.g. `math/b4-form-c/help.json`): one entry per question with `id` (e.g. `I-6`, `II-8`), `skill`, `lesson` tag text, `links` (label → classroom URL) and `hints` (3 strings, HTML allowed for fractions). The format is subject-neutral and becomes the item format for the grader later.
- **`math/help.js`** (shared, like `form.js`): loads `help.json`, adds a Help button to each `.q`, renders the step panel, and offers the "Ask" box only if `GET /api/health` on the same origin answers.
- **`scripts/tutor.mjs`**: a bun server that serves `dist/` and `POST /api/ask` (question text, the hints shown so far, and the student message) → spawns `claude -p` (or `codex` via `TUTOR_CLI`) with tools off and a tutor system prompt: no more than the current step, short, 7th-grade wording, the book's notation. It streams the reply, caps message length, and appends hint/ask events to a local JSONL log (gitignored).
- **Access:** `bun run tutor`, then open `http://<mac>.local:8080` on the home wifi. On the public site, the hints and links work and Ask is hidden.

## Order

Block 4 Form C end to end → the kid tries it → Forms B and D.

## Later

- A tunnel so the local tutor is reachable from anywhere (research free options: Cloudflare Tunnel, Tailscale Funnel, ngrok, etc.).
- Auto-grader, saved progress, AI-generated follow-up questions per weak skill, other subjects.

## Left to the builder

The exact panel styling (match form.css), the question-id scheme in the HTML, the CLI flags for tools-off and streaming, the log event shape, and the port.
