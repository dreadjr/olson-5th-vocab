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
