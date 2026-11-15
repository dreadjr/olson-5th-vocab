# Word Works: Olson 5th grade vocab

Vocabulary practice games built from simple word lists. Each list becomes its own page with five activities:

- **Meaning quiz**: multiple choice, word to meaning and meaning to word. It keeps a best score.
- **Flash cards**: tap to flip. It can show the word first or the meaning first.
- **Guess the word**: read the meaning, say the word, flip, then mark whether you got it.
- **Spelling practice**: hear the word, then type it. Wrong letters are marked. **Easy** mode fills in part of the word. The blanks go on the tricky spots, vowels and double letters, and the first letter is always shown.
- **Look, cover, write**: see the word split into syllables and say each part, then it's covered and you write it from memory. A miss gets fixed right away while you look at the correct spelling, and the word comes back a few turns later. The round ends when every word has been written correctly from memory.

Look, cover, write is based on retrieval-practice versions of Look-Say-Cover-Write-Check. Saying the word in parts connects sounds to letters, recalling it from memory strengthens it more than copying, instant correction stops mistakes from sticking, and missed words return after a short gap (spaced repetition).

Every page is a single self-contained HTML file. It works offline and can be opened straight from disk.

## How it's organized

```
sets/              one JSON file per word list  ← the only thing you normally edit
  m1w1.json
  m1w2.json
src/template.html  the game (shared by every set)
src/library.html   the home page that lists all sets
scripts/           build, new-set, check, preview (no dependencies)
dist/              generated output (not committed)
```

The file name becomes the page address: `sets/m1w2.json` is published at `/m1w2/`.

## Add a new word list

Paste the list from anywhere, with one word per line and a separator between the word and its meaning. A tab, `|`, ` - `, `:` or `=` all work. Numbering like `1.` is ignored.

```sh
pbpaste | npm run new -- m1w3 --title "Module 1, Week 3"
# or from a file
npm run new -- m1w3 --title "Module 1, Week 3" --from words.txt
```

Optional flags are `--subtitle "12 words about ..."` and `--date 2026-10-02`. Dates sort the home page newest first. Add `--force` to overwrite an existing set.

With no list, the script writes an empty set for you to fill in by hand.

You can also skip the script. Copy an existing file in `sets/`, rename it, and edit it, either locally or on github.com with the pencil icon. Pushing to `main` redeploys.

## Change words in an existing list

Edit the file in `sets/` and push. Each word needs a `word` and a `definition`. A set needs at least 4 words, because the quiz shows 4 choices.

```json
{
  "title": "Module 1, Week 2",
  "subtitle": "12 words",
  "date": "2026-09-25",
  "words": [
    { "word": "irrigate", "syllables": "ir-ri-gate", "definition": "To supply water to land or crops." }
  ]
}
```

`syllables` is optional. It controls how Look, cover, write splits the word: the word with dashes between its parts. Without it, the game guesses the split automatically. The guess is right most of the time but not always (it gives `pho-nog-raph`, not `pho-no-graph`), so add it for any word where the split matters.

`npm run check` finds mistakes (missing definitions, duplicate words, broken JSON) without building. The deploy runs the same check, so a broken file won't go live.

## Build and preview locally

Requires Node 18 or newer. There are no packages to install.

```sh
npm run build     # writes dist/
npm run preview   # builds, then serves at http://localhost:4321
```

## Deployment

**Firebase Hosting (the link to share with students):** https://kok-5th.web.app. School web filters block `github.io` but allow this one. It is not deployed automatically yet: after pushing a new set, run `npm run deploy` from your machine. That builds and deploys to the `kok-5th` project with whichever Firebase account `firebase login:use` picked for this folder.

**GitHub Pages (set up already):** `.github/workflows/deploy.yml` builds and deploys on every push to `main`. Pull requests only run the check. You can find the site under the repo's *Settings → Pages*.

**Cloudflare Pages (optional):** connect the repo in the Cloudflare dashboard (*Workers & Pages → Create → Pages → Connect to Git*) and set:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |

To deploy from your machine instead, run `npm run build && npx wrangler pages deploy dist --project-name olson-5th-vocab`.

**Anywhere else:** `dist/` is plain static files, and each `dist/<set>/index.html` can also be shared on its own as a single file.

## Changing the game itself

Edit `src/template.html`. The build fills in these placeholders:

- `{{PAGE_TITLE}}`, `{{SUBTITLE}}`, `{{BACK_LINK}}` for the page text
- `/*{{SET_JSON}}*/null` for the word data, as `{ slug, title, words: [{ word, definition }] }`

Best quiz scores are saved in the browser, separately for each set.

## Math block reviews

Practice versions of the Core Focus on Proportions & Probability block review tests, published at `/math/`. The textbook, classroom and teacher-site links are in [docs/math-sources.md](docs/math-sources.md).

```
math/<slug>/index.html   one review form, e.g. math/b4-form-b/ (copy src/math-form-example.html to start)
math/form.css, form.js   shared print layout and the "Show answers" toggle
math/pdf/                rendered test and answer-key PDFs (committed)
```

Each page needs a `<meta name="review" content='{"block":4,"form":"B","topic":"..."}'>` tag; the build uses it to list the form on `/math/`. Opening a page with `#key` shows the answers.

After adding or changing a form, render its PDFs with the local Chrome and commit them (CI cannot render them):

```sh
bun run math:pdf                 # every form
bun run math:pdf b4-form-b       # just one
```

### Help and the local tutor

A form with a `help.json` next to its `index.html` gets a **Help** button on each question. The button shows a hint, then a similar example, then a walkthrough of this problem, plus the lesson's classroom links from `math/lessons.json`. `bun run check` fails if a form's `help.json` doesn't match its questions. Each of those questions also gets an answer box. A **Progress** bar at the top counts answered, right, to-fix and unchecked questions, with a list of every checked answer (newest first, each linking to its question), and each question number gets a mark: ✓ right, ✗ not yet, • answered but not checked. A **Worksheet · Cards · Focus** switch in the toolbar changes how the page looks on screen (Worksheet is the printable page; Cards puts each question on its own card; Focus shows one question at a time with Prev/Next and a progress strip); printing is always the worksheet. Multiple-choice letters and YES/NO options can be tapped, and those questions check right on the page from the answer key, without the tutor. Questions with one clean answer (an `answer` field in `help.json`: a number, fraction, percent, ordered pair or `y = mx` equation) also check on the page, exactly: `4/12`, `1/3` and `0.333…` are compared as values, not text (`4/12` is right for 1/3, `0.333` is not). Their answer boxes become MathLive math fields on first tap. `bun run check` fails if an `answer` doesn't match a value in that question's answer key. On phones the math keyboard opens on a **Stats** page (fractions, %, mean, median, MAD, quartiles, “of”, “as %”). A **Calculator** button opens a notepad calculator (`math/calc.js`, on every form): one calculation per line with the answer beside it, typed in [MathLive](https://mathlive.io) math fields (loaded from jsDelivr, pinned to 0.111.4, only when the calculator is opened; `/` makes a stacked fraction, Enter starts a new line; a plain text box takes over if it can't load), proportions and one-unknown equations solved (`18/45 = x/360` → `x = 144`), fractions kept exact (`9/36` → `1/4`), `mean`/`median`/`range`/`mad`/`q1`/`q3`/`iqr`, `20% of 80`, `3/4 as %`, named values (`p = 45/150`) and `ans`; the notes are kept per form in that browser. Each hint's worked calculations get small **+ 9 · 8** buttons that open the calculator with that line added. Calculator lines are tagged with the question you were on when you wrote them; each question shows its **Calculator work**, every Check saves that work with the attempt, and with the tutor running the work is logged and given to the checker as context. A **Lessons covered** row of checkboxes hides the questions from lessons the class hasn't reached yet; the choice applies to every form and also to printing. All of this is kept in that browser only. Block 4 Form C has hints so far.

To let your kid type questions to an AI tutor, run it on your Mac and open the address it prints from any device on the home wifi:

```sh
bun run tutor                    # http://<your-mac>.local:8080/ ; uses the claude CLI
TUTOR_MODEL=opus bun run tutor   # pick the Claude model (default: sonnet)
```

To keep it running all the time and reach it from anywhere, run it as a login service and point a Cloudflare tunnel at it:

```sh
bun run service install tutor.example.com   # starts the tutor on port 8080 at login; restarts it if it stops
bun run service status
bun run service uninstall
```

The tunnel runs as its own system service (installed once with `sudo cloudflared service install <token>` from the Cloudflare dashboard, Zero Trust → Networks → Tunnels). In the dashboard, give the tunnel a public hostname that points at `http://localhost:8080`. The tutor rebuilds the site each time it starts, so run `bun run service install` again after changing forms or hints. Because the address is public, the service sets a private key (kept in `~/.config/kok-tutor/key`): `install` prints a link with `?key=…` to open once on each device. Without the key, the pages and hints still work but Ask and Check are hidden. The log is `logs/com.kok5th.tutor.log`.

The tutor runs `claude` with no tools, in an empty folder, without your own settings, hooks, plugins or memory, and tells it not to give away more than the step the student is on. If the CLI fails, times out (60 s) or is signed out, the panel says the tutor isn't available. Codex isn't offered because `codex exec` can still run shell commands. With the tutor running, the answer box also gets a **Check** button: the AI compares the answer with the key on the page (so 2/6 counts for 1/3) and says right or not yet, with a nudge that doesn't give the answer away. Every hint opened, question asked and answer checked is added to `logs/tutor.jsonl` (not committed). On the public site, the hints and links still work, and the Ask box is hidden.
