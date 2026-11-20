# Open education data standards, formats and protocols for a tiny static study site (as of Nov 2026)

Project context: a no-build, no-dependency static site (plain HTML/JS on Firebase Hosting) plus a local Node "tutor" server, one 5th–7th grade student at home. Today: hand-written HTML questions + per-form JSON (hints, lesson tag, clean answer), progress in localStorage, JSONL event log (hint opened, answer checked with correct/feedback + calculator work, question asked). Goal: reuse standards where they fit, stay generic across math, spelling, grammar.

Summary verdict table (details and sources in the sections below):

| Standard | Verdict for this project |
|---|---|
| QTI 3.0 | Adopt the data model only (interaction names, response/correct-response/feedback ideas); do not store items as QTI XML or ship a QTI player |
| xAPI 2.0 / cmi5 | Adopt the statement shape for the JSONL log (actor/verb/object/result/context); skip LRS and cmi5 |
| LTI 1.3 / Advantage | Skip |
| Caliper 1.2 | Skip |
| SCORM | Skip |
| H5P | Skip as the engine; optionally borrow its text markup for blanks (`*answer*`) as inspiration |
| Open Badges 3.0 | Skip (local "achievements" in plain JSON if motivation is wanted) |
| Standards IDs (CASE / CCSS codes) | Adopt now: store human-readable statement codes (e.g. `7.SP.C.8`, `L.6.1`) as tags, optionally the CASE UUID |
| MathML Core | Adopt now for display (native in all major browsers); keep LaTeX as the authored/stored source |
| COPPA / FERPA | Neither binds a parent running a site for their own child; follow data minimization anyway; do not send statements to a third-party LRS |

---

## 1. 1EdTech QTI 3.0 (item/test format, interactions, players, worth storing items as QTI?)

### Takeaway
QTI 3.0 is the mature, free-to-read assessment item standard (released May 2022) and has several open JS players in 2026, but every viable player needs a build step or a sizable bundle and XML authoring is heavy; for a one-student static site the right move is to borrow QTI's vocabulary (interaction types, responseDeclaration/correctResponse, modal feedback, hints-as-adaptive-items) inside the existing JSON, not to store QTI XML.

### Cited Findings
- QTI is "an open format that enables the interoperability of assessment items and tests. The latest version QTI 3.0 was released in May 2022"; QTI 3 folds in APIP accessibility and uses "web-friendly markup using web components" and shared CSS vocabulary — [1EdTech QTI versions](https://www.1edtech.org/standards/qti/versions)
- 1EdTech's chief architect announced the final QTI 3.0 release — [1EdTech blog: Finally final, the QTI 3.0 release](https://www.1edtech.org/blog/finally-final-the-qti-30-release)
- Interaction coverage relevant here (from a 2026 support matrix): choice (multiple choice), text entry (short text / numeric typed answer), extended text, inline choice (dropdown in a sentence — good for grammar), gap match, hotspot, hottext (click words in a passage — good for "mark the error" grammar), match, order, graphic order, associate, graphic associate, graphic gap match, media, position object, select point (click a point on a graph), slider, upload, drawing, end attempt (used for "get a hint" in adaptive items), and Portable Custom Interaction (PCI) as a host contract; deprecated `qti-custom-interaction` is not targeted — [Longsight: QTI 3 TypeScript 0.9.5](https://www.longsight.com/blog/qti3-095-secure-delivery-conformance)
- There is no dedicated "math entry" interaction in that list; math answers are text entry (scored by string/number match) or a PCI (e.g. wrapping a math editor) — [Longsight support matrix](https://www.longsight.com/blog/qti3-095-secure-delivery-conformance) (inference from the list; see Inferences)
- Amp-up.io `qti3-item-player`: "100% JavaScript component that aims to encapsulate the best practices and behaviors of the IMS Global QTI 3 Assessment Item specification"; MIT license; roadmap items checked: template processing, response processing, adaptive items + QtiEndAttemptInteraction, Match, GapMatch, GraphicGapMatch, Hottext, Hotspot, Order, PortableCustom, SelectPoint, Media; built with Vue (vue.config.js, babel) — [GitHub amp-up-io/qti3-item-player](https://github.com/amp-up-io/qti3-item-player)
- Amp-up.io player is 1EdTech-certified as a QTI 3 player and can be a "standalone previewer or the front end of a delivery system" — [1EdTech certification: Amp-up.io QTI 3 Test Player](https://site.imsglobal.org/certifications/amp-upio/amp-upio-qti-3-test-player)
- Maintenance (GitHub API, checked 2026-11-15): amp-up-io/qti3-item-player last push 2025-06-21, 30 stars, MIT (slowing); Citolab/qti-components last push 2026-11-12, GPL-3.0, README badge "WIP – no stable, usable release"; LongsightGroup/qti3 last push 2026-11-11, MIT, 6 stars — GitHub API (`gh api repos/...`), [Citolab/qti-components](https://github.com/Citolab/qti-components), [LongsightGroup/qti3 via Longsight blog](https://www.longsight.com/blog/qti3-095-secure-delivery-conformance)
- Citolab `@citolab/qti-components` is "a web component library that can be used to render 1EdTech QTI items", installed via npm and `import '@citolab/qti-components'` (bundler-oriented) — [GitHub Citolab/qti-components](https://github.com/Citolab/qti-components)
- Citolab also has `qti-playground`, an open-source app to "test, play, and upgrade QTI packages directly in the browser" (useful as a free authoring/preview tool) — [Citolab/qti-playground](https://github.com/Citolab/qti-playground)
- Longsight `@longsightgroup/qti3-player` 0.9.5 (June 30, 2026) is a native Web Component; the release adds "candidate-safe XML, server-side submissions, PNP resolution"; they call an interaction "supported" only when it parses, validates, renders, scores, has a fixture, passes conformance and a11y checks — [Longsight blog](https://www.longsight.com/blog/qti3-095-secure-delivery-conformance)
- PIE's `pie-qti`: QTI 2.x players production-ready, QTI 3.0 enhancements still in progress — [pie-framework/pie-qti (ecosyste.ms)](https://awesome.ecosyste.ms/api/v1/projects/github.com%2Fpie-framework%2Fpie-qti)

### Inferences
- License/cost: the QTI 3.0 spec documents are publicly readable on 1EdTech's site; certification requires 1EdTech membership. Neither is needed to use the format privately (the certification page above is the only place cost applies).
- Adoption weight: storing items as QTI XML means (a) hand-writing verbose XML per question, (b) shipping a player bundle (Vue-based Amp-up, GPL Citolab with a not-yet-stable release, or the very young Longsight package with 6 stars), and (c) losing the current page's custom touches (stacked fractions, calculator capture per question, MathLive answer boxes) unless rebuilt as PCIs. That conflicts with "no build, no dependency".
- QTI is XML-first; there is no official QTI JSON binding that the players consume, so "QTI as JSON" would be a home-grown mapping anyway.
- What is worth copying into the existing per-form JSON (data model only): `interaction` type names from QTI (`choice`, `textEntry`, `inlineChoice`, `hottext`, `gapMatch`, `selectPoint`, `graphicGapMatch`), a `correctResponse` (+ optional `mapping` for alternate accepted answers / numeric tolerance), `feedback` keyed by outcome, and hints modelled like QTI adaptive items (each hint = an "end attempt" that reveals more). This keeps a migration path open: a future exporter could emit QTI XML from the JSON.
- Graphing items (plot a point, drag labels onto a picture) map to `selectPoint`/`positionObject`/`graphicGapMatch`; if the site ever needs them, borrow the names, implement with SVG.
- Verdict: **adopt the data model only.**

### Gaps
- Did not verify whether any QTI 3 player ships a single prebuilt ES-module file usable without a bundler (Amp-up has a demo build; unverified).
- Did not find a 1EdTech page listing a QTI 3.0 errata/3.0.x version newer than the 2022 release as of Nov 2026.
- No dedicated QTI "math entry" interaction was found; any claim of one should be treated as unverified.

---

## 2. xAPI 2.0 (IEEE 9274.1.1) and cmi5; LRS options; JSONL shaped as xAPI

### Takeaway
xAPI 2.0 is a published IEEE standard (IEEE 9274.1.1-2023) whose actor/verb/object/result/context statement shape fits the current event log almost one-to-one; the best middle ground is to keep writing JSONL locally but shape each line as an xAPI statement (with `cmi.interaction` activities and extensions for hints and calculator work), and skip running an LRS or using cmi5 (cmi5 assumes an LMS launching content).

### Cited Findings
- "IEEE 9274.1.1-2023" — xAPI 2.0 — is described by ADL as the first open-source standard in IEEE's history; formally approved in 2023 — [ADL: xAPI Officially Becomes a Published IEEE Standard](https://adlnet.gov/news/2023/11/22/xAPI-Officially-Becomes-a-Published-IEEE-Standard); dates differ (Wikipedia gives 10 Oct 2023) — [Wikipedia: Experience API](https://www.wikipedia.com/wiki/Tin_Can_API)
- ADL LRS Conformance Test Suite updated for xAPI 2.0; Rustici Engine's LRS accepts 1.0 and 2.0 — [ADL news](https://adlnet.gov/news/2023/11/22/xAPI-Officially-Becomes-a-Published-IEEE-Standard), [Rustici 2023 recap](https://rusticisoftware.com/blog/what-happened-in-2023-and-whats-next-for-elearning-standards/)
- Result object: optional `success`, `completion`, `response`, `duration`, `score` (`scaled`, `raw`, `min`, `max`) and `extensions`; all optional — [xAPI.com Deep Dive: Result](https://xapi.com/blog/deep-dive-result/)
- `http://adlnet.gov/expapi/activities/cmi.interaction` is the activity type for quiz questions — [Watershed: authoring quiz/question statements](https://support.watershedlrs.com/hc/en-us/articles/360003934951-How-do-I-author-quiz-and-question-xAPI-statements)
- Interaction types enumerated by the spec include `true-false`, `choice`, `fill-in`, `long-fill-in`, `matching`, `performance`, `sequencing`, `likert`, `numeric`, `other` (crate source lists fill-in, long-fill-in, numeric, performance, matching, other among them) — [xapi-data interaction_type.rs](https://docs.rs/xapi-data/latest/src/xapi_data/interaction_type.rs.html)
- Numeric `correctResponsesPattern` uses `min[:]max` (e.g. `"18[:]18"`); multi-blank fill-in separates answers with `[,]` — [Watershed](https://support.watershedlrs.com/hc/en-us/articles/360003934951-How-do-I-author-quiz-and-question-xAPI-statements), [H5P example statement](https://h5p.org/node/3426)
- Fill-in example: `interactionType: "fill-in"`, learner answer in `result.response` — [Articulate: Implementing xAPI](https://articulate.com/support/article/Implementing-Tin-Can-API-to-Support-Articulate-Content)
- cmi5 restricts which statements are "cmi5 allowed" vs "cmi5 defined" and is built around an LMS launching an assignable unit; xAPI JS ships a cmi5 helper (`interactionFillIn`, etc.) — [xapijs.dev cmi5 allowed statements](https://www.xapijs.dev/cmi5-profile-library/cmi5-allowed-statements)
- No dedicated xAPI verb for "hint" was found in search; quiz statements typically use "answered" on a `cmi.interaction` object — (search result summary; see Gaps)
- LRS options (GitHub API, checked 2026-11-15):
  - Yet Analytics **SQL LRS**: Apache-2.0, supports SQLite and Postgres, latest release v0.9.13 on 2026-11-14 (actively maintained) — [GitHub yetanalytics/lrsql](https://github.com/yetanalytics/lrsql)
  - **ADL LRS** (reference): Apache-2.0, updated for IEEE 9274.1.1, but "only intended to support a small amount of users as a proof of concept"; last push 2025-11-14 — [GitHub adlnet/ADL_LRS](https://github.com/adlnet/ADL_LRS)
  - **Learning Locker** (community, Learning Pool): GPL-3.0, last GitHub release v7.1.1 on 2021-11-16, last push 2024-05-30 — effectively stalled as open source; Learning Pool sells it as a managed LRS — [GitHub LearningLocker/learninglocker](https://github.com/LearningLocker/learninglocker), [UK G-Cloud listing](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/137575071396193)
  - **TRAX LRS 3.1 Starter Edition**: GPL-3.0, PHP/Laravel (Composer), last push 2025-12-26 — [GitHub trax-project/trax3-starter-lrs](https://github.com/trax-project/trax3-starter-lrs)

### Inferences
- Mapping of current events to xAPI (suggested shape for each JSONL line; standard verbs from the ADL vocabulary):
  - answer checked → verb `http://adlnet.gov/expapi/verbs/answered`, object = question activity id (e.g. `https://<site>/math/4.3#q7`) with `definition.type = cmi.interaction`, `interactionType` = `numeric` / `fill-in` / `choice`, `correctResponsesPattern`; `result.response` = typed answer, `result.success` = correct; feedback text and calculator work in `result.extensions` under site-owned IRIs (e.g. `https://<site>/xapi/ext/feedback`, `.../calculator-lines`).
  - hint opened → no standard "hint" verb; use a site-defined verb IRI (e.g. `https://<site>/xapi/verbs/requested-hint`) or `http://adlnet.gov/expapi/verbs/interacted` with `context.extensions` hint index. Defining your own verb IRI is allowed by xAPI.
  - question asked to tutor → `http://adlnet.gov/expapi/verbs/asked` (exists in the ADL vocabulary) with the question text in `result.response`.
  - page opened → `http://activitystrea.ms/schema/1.0/experience`/`http://adlnet.gov/expapi/verbs/experienced`.
  - actor: use a pseudonymous `account` (`{homePage: "https://<site>", name: "student1"}`), not an email `mbox`.
- Benefits: a later move to a real LRS (SQL LRS on the local Node box, SQLite) is a POST of the existing lines; analysis code can reuse xAPI tooling. Cost: a few more bytes per line, nested fields.
- Running an LRS is not needed for one learner: SQL LRS is the only option that is active, permissive-licensed and SQLite-backed, and it is a JVM service — more than the current Node tutor needs.
- Verdict: **adopt the statement shape for the JSONL log (data model only); skip cmi5; skip an LRS for now (SQL LRS if ever needed).**

### Gaps
- Could not fetch the ADL verb registry in this session to quote the exact verb list (`answered`, `asked`, `attempted`, `experienced`, `interacted` are from background knowledge of the ADL vocabulary; verify at adlnet.gov / the xAPI Profile Server before relying on exact IRIs).
- Veracity LRS free tier: not checked in this session (pricing pages may have changed).
- Learning Pool's official stance on Learning Locker community end-of-life: no official notice found; status inferred from GitHub activity only.
- No source found for a standard xAPI pattern for "hint" or "scratch work"; extension IRIs would be project-defined.

---

## 3. LTI 1.3 / Advantage, Caliper, SCORM — relevant for a home site?

### Takeaway
All three solve institution-to-vendor integration (LMS launches tool, LMS collects analytics, LMS plays packaged course) and assume an LMS on one side; with no LMS, none applies. Skip all three.

### Cited Findings
- Caliper Analytics "enables institutions to collect learning data from digital resources"; current spec is Caliper 1.2 with an Assessment Profile, Tool Use Profile, etc.; conformance certification and sensor APIs are listed under "Member Resources (Login Required)" — [1EdTech Caliper](https://www.1edtech.org/standards/caliper)
- xAPI's Result object maps directly to SCORM 2004 CMI fields (score raw/min/max/scaled) — showing xAPI already covers what SCORM records — [xAPI.com Deep Dive: Result](https://xapi.com/blog/deep-dive-result/)

### Inferences
- LTI 1.3: OAuth2/OIDC launch from a platform (Canvas, Moodle, Schoology) into a tool; needs a server that validates JWTs and registrations. Only relevant if the student's school LMS should launch the site — not the case. Skip.
- Caliper: overlaps xAPI, smaller open tooling ecosystem, member-gated certification. Skip (xAPI shape chosen instead).
- SCORM: zip packages + JS runtime API that an LMS provides; meaningless without an LMS. Skip.

### Gaps
- Did not fetch the LTI 1.3 page this session; LTI status/version claims above are background knowledge, not freshly cited.

---

## 4. H5P

### Takeaway
H5P has exactly the language-arts content types the project would want (Fill in the Blanks, Drag the Words, Mark the Words, Dictation, Question Set) and can run on a static site via the MIT-licensed `h5p-standalone` player with built-in xAPI events, but content must be authored in an H5P editor (WordPress/Moodle/Drupal or Lumi) and the runtime is a heavy jQuery-era bundle; skip as the engine, but its xAPI output confirms the xAPI shape above.

### Cited Findings
- Content types listed on h5p.org include Dialog Cards, Dictation ("Create a dictation with instant feedback"), Drag and Drop, Drag the Words ("text-based drag and drop tasks"), Essay, Fill in the Blanks, Mark the Words, Question Set, etc.; authoring is via the WordPress, Moodle or Drupal plugin — [H5P Examples and Downloads](https://h5p.org/content-types-and-applications)
- Licensing: code is MIT "wherever possible", but the H5P PHP library is GPL because of third-party purifier code; content on h5p.org is CC BY 4.0 — [H5P Licensing](https://h5p.org/licensing); `h5p/h5p-php-library` is GPL-3.0 (GitHub API)
- `h5p-standalone` "Display H5P content without the need for an H5P server"; can load from jsDelivr with `<script>` tags (no build), options `h5pJsonPath`, `frameJs`, `frameCss`; emits xAPI via `H5P.externalDispatcher.on("xAPI", ...)` — [GitHub tunapanda/h5p-standalone](https://github.com/tunapanda/h5p-standalone)
- `h5p-standalone`: MIT, 347 stars, latest GitHub release v3.8.2 on 2026-03-24 (README examples mention 3.9.0) — GitHub API; [repo](https://github.com/tunapanda/h5p-standalone)
- H5P Fill in the Blanks emits `cmi.interaction` `fill-in` statements with multiple blanks separated by `[,]` — [H5P "Answered fill in the blanks" example](https://h5p.org/node/3426), [Answered Multichoice](https://h5p.org/node/3428)

### Inferences
- Data format: an `.h5p` is a zip of `h5p.json` + `content/content.json` + library folders; standalone needs the extracted folder including every library's JS/CSS on the host — sizeable relative to the current site.
- It can't reproduce the site's math specifics (MathLive answer boxes, calculator capture), and mixing two UI systems would hurt consistency.
- Worth borrowing: the Fill in the Blanks / Drag the Words authoring syntax (answers wrapped in asterisks, alternatives separated by `/`) as a compact plain-text item format for spelling/grammar.
- Verdict: **skip** (optional: borrow the `*answer*` blank markup).

### Gaps
- Did not verify the exact asterisk/slash syntax from the H5P docs in this session (background knowledge).
- Lumi (desktop H5P editor) status not checked.

---

## 5. Open Badges 3.0 (W3C Verifiable Credentials)

### Takeaway
Open Badges 3.0 is a signed Verifiable Credential format meant for portable, third-party-verifiable achievements; for a home motivation system it adds key management and signing with no benefit, so skip it (plain local "achievement" JSON gives the same motivational effect).

### Cited Findings
- Open Badges 3.0 and CLR 2.0 assertions are "specific to one earner"; each OpenBadgeCredential is "digitally signed by its issuing organization as Verifiable Credentials compatible with the Verifiable Credentials Data Model 2.0"; JSON/JSON-LD; badges have a PNG/SVG image carrying the data — [1EdTech Open Badges](https://www.1edtech.org/standards/open-badges)
- Exchange via Badge Connect API (OAuth 2.0); 1EdTech offers certification for 2.1 and 3.0 — [1EdTech Open Badges](https://www.1edtech.org/standards/open-badges)

### Inferences
- A signed credential identifying a child, posted or imported into a wallet, is the opposite of data minimization; motivation needs only on-device streaks/levels.
- If ever wanted, reuse the `Achievement` fields (name, description, criteria, image) as a local JSON shape — no signing.
- Verdict: **skip.**

### Gaps
- Did not check free open-source OB 3.0 issuers in this session.

---

## 6. Standards alignment IDs (CASE, CCSS codes, ASN, Learning Commons)

### Takeaway
Use the human-readable CCSS statement codes (e.g. `5.NF.B.4`, `7.SP.C.8`, `L.5.1`, `L.6.1`, `L.7.1`) as the alignment tag on every item, and optionally the CASE UUID; the best free machine-readable source in 2026 is the Learning Commons (CZI) Knowledge Graph "U.S. academic standards" dataset (CASE-derived, downloadable CSV/REST/MCP, refreshed monthly).

### Cited Findings
- CASE gives standards canonical, machine-readable identifiers via a JSON data model exchanged through a REST API — [1EdTech CASE implementation guide](https://standards.1edtech.org/case/guides/standards/v1p1/impl), [CASE service spec](https://standards.1edtech.org/case/specifications/standards/v1p1/im)
- CASE Network hosts a central repository of K-12 state standards (414 frameworks); state-published CASE statements can be used at no cost — [CASE Network overview](https://learnworkecosystemlibrary.com/?p=3389)
- Google Classroom stores learning-standard metadata "sourced from CASE Network", keyed by CASE GUIDs — [Google Classroom API CaseGuid](https://developers.google.com/workspace/classroom/reference/rest/v1/CaseGuid)
- Learning Commons "U.S. academic standards" dataset: source is Common Good Learning Tools' CASE data for all 50 states; K-12; Math, ELA, Social Studies, Science, Language Development; refreshed monthly; superseded frameworks kept — [Learning Commons docs: U.S. academic standards](https://docs.learningcommons.org/knowledge-graph/datasets/us-academic-standards)
- Access: local file download (dataset catalog / direct links / curl), REST API (`/standards-frameworks?academicSubject=Mathematics`, `/academic-standards?standardsFrameworkCaseIdentifierUUID=...`, "search by statement code"), and an MCP server (`find_standard_statement`) — [Learning Commons docs](https://docs.learningcommons.org/knowledge-graph/datasets/us-academic-standards)
- Licensing: datasets labeled Open (typically CC BY 4.0 or CC0), Open + Gated, or Gated; use is subject to Learning Commons Terms of Use — [GitHub learning-commons-org/knowledge-graph](https://github.com/learning-commons-org/knowledge-graph)
- Release notes show Common Core crosswalks to state standards added Jan–Feb 2026 (v1.3.0–v1.5.0) — [Learning Commons release notes](https://docs.learningcommons.org/knowledge-graph/v1-5-0/resources/release-notes)
- Common Standards Project API (older community source of standards incl. CCSS): Apache-2.0, last push 2026-09-11 — GitHub API, [commonstandardsproject/api](https://github.com/commonstandardsproject/api)

### Inferences
- For a home site, a static tag like `"standards": ["CCSS.MATH.CONTENT.7.SP.C.8"]` (or short `7.SP.C.8`) is enough; it is stable, readable, and joinable later to CASE UUIDs from the Learning Commons CSV without calling any API at runtime.
- If the student's state uses its own framework (not CCSS), the Learning Commons crosswalks map CCSS codes to state codes.
- ELA conventions: grammar `L.5.1`/`L.6.1`/`L.7.1`, spelling `L.5.2e`/`L.6.2b`/`L.7.2b` (codes from background knowledge — verify in the dataset).
- Achievement Standards Network (ASN): no fresh source found in this session; Learning Commons/CASE supersede it for US K-12 use.
- Verdict: **adopt now** (tags only; no runtime dependency).

### Gaps
- Did not confirm the exact license label on the U.S. academic standards dataset page (Open vs Gated) — check the dataset catalog before redistributing; CCSS text itself carries the NGA/CCSSO public license.
- Did not confirm whether CASE Network 2 itself offers anonymous free API access in 2026 (sources conflict on whether Learning Commons' upstream is CASE Network 2 or Common Good Learning Tools).
- ASN current status not researched.

---

## 7. MathML Core / MathML 4 in browsers; relation to LaTeX and MathLive

### Takeaway
MathML Core renders natively in Chrome since 109 and in Firefox/Safari (caniuse global ~96%), so stacked fractions and exponents can be shown without a renderer library; MathML 4 (full, with semantics) is still a Working Draft. Keep LaTeX (what MathLive reads/writes) as the stored form and render to MathML for display.

### Cited Findings
- MathML: Chrome 97–108 disabled by default, supported 109+; global usage 96.13% — [caniuse MathML](https://caniuse.com/mathml)
- MathML Core latest Candidate Recommendation Snapshot found: 24 June 2025; the Math WG says Core "is currently in CR" — [W3C MathML Core history](https://www.w3.org/standards/history/mathml-core)
- MathML 4.0 latest found: Working Draft 29 Jan 2026; CR target slipped from Feb 2026 to May 2026; 2026 charter lists expected completion Q4 2026 — [MathML 4 WD](https://www.w3.org/TR/2026/WD-mathml4-20260129/), [WG minutes Mar 2026](https://lists.w3.org/Archives/Public/www-math/2026Mar/0007.html), [Math WG charter 2026](https://www.w3.org/Math/Documents/Charter2026.html)
- MathLive: MIT, ~2.2k stars, last push 2026-11-07 (active) — GitHub API, [arnog/mathlive](https://github.com/arnog/mathlive)

### Inferences
- MathLive's native value is LaTeX (and it can also export MathML and MathJSON via its conversion functions — background knowledge; verify in MathLive docs). LaTeX is compact, author-friendly and diffable; MathML is the display/accessibility target. MathJSON (CortexJS) is the better form for checking equivalence of answers.
- Verdict: **adopt MathML Core for display now; store LaTeX; don't wait for MathML 4.**

### Gaps
- MathLive docs page fetch failed (404); exact export function names (`convertLatexToMathMl`, `getValue('math-ml')`) unverified this session.
- Could not confirm whether MathML 4 reached CR after May 2026.

---

## 8. Privacy: COPPA (2025 amendments), FERPA, data minimization, third-party LRS

### Takeaway
COPPA governs operators of child-directed online services collecting personal information from under-13s and FERPA governs schools receiving federal funds; neither binds a parent running a private study site for their own child, but the amended COPPA rule's direction (data minimization, retention limits, separate consent for third-party disclosure) is the right design default — keep data on the local tutor/device and never send statements to a third-party LRS.

### Cited Findings
- Amended COPPA Rule published in the Federal Register April 22, 2025; effective June 23, 2025; compliance required by April 22, 2026 (except §312.11(d)(1), (d)(4), (g)) — [Federal Register 2025-05904](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule), [Hunton summary](https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-publishes-final-coppa-rule-amendments)
- Safe-harbor programs had until Oct 22, 2025 — [Mondaq: compliance deadlines set](https://www.mondaq.com/unitedstates/privacy-protection/1621136/ftc-finally-publishes-amended-coppa-rule-compliance-deadlines-set)
- The amended rule applies to "operators of child-directed websites and online services, as well as those with actual knowledge that they collect personal information from children under 13" — [Mondaq: amended rule now in full effect](https://webiis10.mondaq.com/unitedstates/privacy-protection/1790866/coppas-amended-rule-is-now-in-full-effect-what-operators-need-to-know)
- FERPA gives parents rights over their children's "education records"; statute 20 U.S.C. §1232g, regulations 34 CFR Part 99; ED lists audiences as schools, ed-tech vendors, parents — [studentprivacy.ed.gov: What is FERPA](https://studentprivacy.ed.gov/faq/what-ferpa)

### Inferences
- The site is not a commercial "operator" collecting from the public; the parent is the data controller and consenting party. Still, if the Firebase site were ever opened to other children, COPPA would apply (verifiable parental consent, written retention policy, separate consent for third-party disclosure under the 2025 amendments — the latter three from background knowledge of the amendments; verify in the Federal Register text).
- FERPA: not applicable (no school, no federal funds); it would only matter if data were shared into a school system.
- Practical minimization implied by these standards: pseudonymous xAPI `account` actor (no name/email), no free-text PII in logs, keep the JSONL on the local Node tutor or device, no analytics SDKs on the Firebase site, no third-party LRS (a hosted LRS is a third-party disclosure of a child's learning data and its retention/terms are outside the parent's control). Tutor questions sent to an LLM API are also a third-party disclosure — worth a conscious decision.

### Gaps
- FTC COPPA FAQ page returned HTTP 403; did not quote FTC guidance on parent-run/household services directly.
- Exact text of the 2025 amendments (data retention policy, separate third-party consent) not quoted in this session.
