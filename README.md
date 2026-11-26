# deutsch-tree

A syllabus tree for learning German from zero to the Goethe B1 exam. A static
site with no backend, no accounts and no analytics.

- What it must do: [docs/spec.md](docs/spec.md)
- How every screen must look: [docs/design-direction.md](docs/design-direction.md)
- How to write a node: [content/README.md](content/README.md)

## Commands

Needs Node 24 or newer and pnpm. Run `pnpm install` first, and once per
machine `pnpm exec playwright install chromium` for the browser tests.

| Command | What it does |
|---|---|
| `pnpm check` | Everything below, in this order. Run it before every merge. |
| `pnpm typecheck` | TypeScript, whole project. |
| `pnpm lint` | Biome: formatting and lint rules. `pnpm lint:fix` repairs what it can. |
| `pnpm content:check` | The content pipeline on the real content in `content/`. Prints the report; fails on any error. |
| `pnpm review:pool <id>`, `pnpm review:record <id>` | The blind review that a node needs before it is published. The steps are in [content/README.md](content/README.md). |
| `pnpm test:unit` | All Vitest tests (`tests/**/*.test.ts`). `pnpm test:pipeline` runs only the content pipeline tests. |
| `pnpm test:browser` | Playwright journeys (`tests/browser/*.spec.ts`) against the built site with fixture content. |
| `pnpm pack:build` | Builds a private pack from a book the learner owns. Options and format: [docs/private-packs.md](docs/private-packs.md). |
| `pnpm dev` | Dev server on the real content. Content files reload on save. |
| `pnpm build` | Compiles the content and builds the site into `dist/`. Fails on any content error. |

`CONTENT_DIR=<folder>` makes `dev`, `build`, `content:check` and the review commands use another
content folder, for example `tests/fixtures/content`.

## Layout

One folder per module of the spec. Relative imports carry the `.ts` or `.tsx`
ending, because the pipeline runs directly in Node.

| Folder | Module |
|---|---|
| `content/` | The real content: one YAML file per node under `content/nodes/`, the chapters that group them in `content/chapters.yaml`, and the official mock exams the app links to in `content/official-mock-exams.yaml`. |
| `src/content-model/` | The schema of a node file and the types of the compiled bundle. Everything else depends on it. |
| `src/content-pipeline/` | Node files in, compiled bundle and report out. `cli.ts` is the command; `vite-plugin.ts` runs it inside the build and the dev server. `checks/` holds one file per rule that the schema cannot state. |
| `src/search/` | Search as pure functions: the node summaries and the search data of one language in, the nodes found for a query out. It decides how typed text meets content (umlauts, capitals, Persian letter forms). No interface, no loading. |
| `src/learning-engine/` | The rules of learning as pure functions: draw an attempt, check answers, score, apply a result to progress, name the milestones reached. No interface, no storage; randomness is passed in. |
| `src/progress-store/` | Keeps progress in browser storage, with a version number, and writes and reads the progress file a learner exports. It reads every older version and refuses a newer one. It only stores; the learning engine decides how progress changes. |
| `src/app/` | App shell: routes, tree, node page, test, backup, search page, overview page. `styles.css` holds the design tokens. `progress.ts` gives components the progress. |
| `src/language/` | Interface strings in English, Persian and simple German, the language in use and the page direction. Components take every word from here. |
| `tests/fixtures/content/` | Small invented content that tests run on. Tests of code never depend on the real content. |
| `tests/real-content/` | The one exception: the real content held against facts of the approved lists that no check can know, such as "the grammar list has 212 rows" or "the exam has 15 parts". |
| `tests/content-pipeline/` | Seam 1: run the pipeline on fixture content and assert on the report. |
| `tests/learning-engine/` | Seam 2: the learning engine's functions, with a seeded stand-in for randomness. |
| `tests/search/` | Search on a small invented catalogue (`catalogue.ts`): what a query finds, in which order, and which passage a result shows. |
| `tests/progress-store/` | The progress store on a stand-in for browser storage, and the progress file. `older-versions.test.ts` holds text saved by each earlier version. |
| `tests/language/` | The interface strings of the three languages, compared key by key. |
| `tests/browser/` | Seam 3: whole journeys in a browser. |
| `src/pack-builder/` | A learner's own exam book in, a private pack out. `cli.ts` is the command; `vite-plugin.ts` keeps packs out of the site build. The pack format's schema is `src/content-model/pack.ts`. |
| `tests/pack-builder/` | Seam 4: build a pack from a synthetic book (`fixture.ts`) and assert on the pack. |

The app never reads node files. It fetches files that the pipeline writes at
build time, each only on the page that shows it:

| File | Holds | Fetched by |
|---|---|---|
| `content/index.json` | The chapters and every node's summary, both in curriculum order. | Every page. |
| `content/nodes/<id>.json` | One node's page. | That node's page and its test; a level's checkpoint, for the nodes it asks about. |
| `content/official-mock-exams.json` | The exams the readiness view links to. | The readiness view (`#/readiness`) and the exam stop that ends the tree's last level. |
| `content/search/<language>.json` | The text of every published node as a list of passages, in one language plus the German. | The search page (`#/search`), in the learner's language only. |
| `content/overview.json` | Every grammar table. | "All grammar at a glance" (`#/overview`). |

So the first load of the tree does not grow when content is written; only
`index.json` grows, by one summary per node. Keep it that way: text that only
one page needs goes into that page's own file, not into the index.

Page addresses live after the `#`, for example `#/node/grammar-001`. The site
is plain files, so this is what keeps direct links and reloads working on
GitHub Pages and from a local folder.

## Tests and progress

- A test is taken at `#/node/<id>/test`. `NodeTest` in `src/app/TestPage.tsx`
  runs it for any node with a pool: it draws an attempt, shows one question
  per screen (`AttemptRun.tsx`), then the result (`TestResult.tsx`).
- Every rule is in `src/learning-engine/index.ts`: `drawAttempt`, `passMark`,
  `checkAnswer`, `scoreAttempt`, `applyAttempt`, `isDone`, and for a
  checkpoint `drawCheckpoint` and `scoreCheckpoint`. Components call these
  and hold no rule of their own.
- A level's checkpoint is at `#/checkpoint/<level>`
  (`src/app/CheckpointPage.tsx`); the tree ends each level's line with it. It
  asks through the same `AttemptRun` as a node's test, so a new question type
  works in it without more code. `drawCheckpoint` asks 30 questions at most
  and 5 at most of one node, dealt in rounds over the published nodes of the
  level: up to 6 nodes give 5 each, 7 to 29 nodes share the 30 evenly, and
  from 30 nodes on a checkpoint asks 30 nodes drawn at random, one question
  each. A node without a pool gives none. `scoreCheckpoint` reports the nodes
  with wrong answers. A checkpoint is advice: it never reads or changes the
  progress. What a node gives to it is `checkpointPool` in that file.
- Progress: read it with `useProgress()` and change it with
  `updateProgress((progress) => …)` from `src/app/progress.ts`, where the
  function comes from the learning engine.
- Backup is at `#/backup` (`src/app/BackupPage.tsx`): export writes
  `deutsch-tree-progress-<date>.json`, import reads it back and asks before it
  replaces progress. Nothing is uploaded. Progress for a node that the content
  no longer has is kept, never pruned.
- Saved progress and the exported file are the `Progress` object plus a
  `version`. To add a field: add it to `Progress` and `emptyProgress` in the
  learning engine, give it a reader in `READERS` in
  `src/progress-store/index.ts` (a missing value reads as empty), raise
  `SAVED_VERSION`, and add the old text to
  `tests/progress-store/older-versions.test.ts`. It is then saved, exported
  and imported with no other code. To reshape something already saved, also
  add a step to `UPGRADES`. The top of that file has the full steps.
- An app never loads progress from a newer version than its own: an import is
  refused with the reason, and such progress found in browser storage is left
  untouched while the page asks for a reload.
- After a milestone the tree suggests a backup once (`BackupSuggestion.tsx`).
  What a milestone is, is `milestonesReached` in the learning engine, worked
  out from the content index: every published topic of a level done, or
  every tenth done topic. Which ones were already mentioned is remembered by
  `src/app/milestones.ts`, outside the progress.
- A new question type needs: its schema and compiled type in
  `src/content-model/index.ts`, its review view in
  `src/content-pipeline/review.ts`, a case in `checkAnswer` and in
  `rightAnswer`, a case in `QuestionView` and in `AnswerText`
  (`src/app/QuestionView.tsx`), and its instruction in the three string
  files. The type checker points at each place that is missing.
- A question whose answer is typed shows `TypedAnswer`
  (`src/app/TypedAnswer.tsx`: the field and the ä, ö, ü, ß buttons) and is
  checked with `checkTyped(text, acceptedAnswers)`. A check says `correct`,
  and for an answer accepted with a note also `notes` (which slips:
  `umlaut-substitute`, `capitalisation`) and `accepted` (the exact spelling).
  `scoreAttempt` keeps both for each question, and the result lists them
  under "Accepted with a note". A missing or wrong word is never a slip.

## The tree: where the learner stands

The rules are in the learning engine, like every rule. The tree
(`src/app/TreePage.tsx`) only lays the answers out.

- **State.** `nodeState(progress, id)` gives `not-started`, `in-progress` or
  `done`. A node is in progress once a result exists for it (a finished test,
  an entered score) and it is not done. Opening a page starts nothing. Read
  the state through this function, never from the fields of the progress: a
  node can become done in other ways than a passed pool. "Coming soon" is not
  a state; it is the node's `status` in the content.
- **Un-marking.** `unmarkDone(progress, id)` makes a done node not done and
  keeps the rest, so it reads as in progress. The node page offers it.
- **Next recommended.** `nextRecommended(nodes, progress)` is the earliest
  node of the index that is published and not done, across kinds and levels.
  It recommends and locks nothing; prerequisites are shown on the node page
  and lock nothing either. `youAreHere` is the same node, or, when every
  published node is done, the first one still to be written.
- **Counts.** `countNodes(nodes, progress)` counts the nodes it is given (a
  level, a kind, a chapter). A "coming soon" node counts as remaining, since
  it is still on the way to the exam; `comingSoon` says how many of the
  remaining ones have to wait. So one done node of 212 reads "1 done · 211
  left, 211 of them coming soon".
- **A test from the tree.** `hasTest` in a node's summary says that the node
  is published and has a pool. Only then does a row offer "Test", which goes
  to `#/node/<id>/test`. A new way of becoming done needs no change here.
- **What the tree shows is in its address**: `#/?level=A2&kind=vocabulary`.
  With no level in the address the tree opens at the level the learner is
  in. Build such an address with `treeAddress` (`src/app/treeAddress.ts`).
  A link "back to the tree" is `<BackToTree from={node} />` from a topic,
  which leads to the topic's level, and `<BackToTree />` from any other
  page, which leads to the tree as the learner last saw it.
- Above the route the tree shows the next topic and at most one note: the
  first-visit steps while the learner has no progress, the backup suggestion
  once they have a milestone. A new note must not make a third panel there.
- A row of a topic, in the tree or in another list, is `NodeRow`
  (`src/app/NodeRow.tsx`).
- A setting of the device that is not progress (the dismissed first-visit
  steps in `src/app/firstVisit.ts`, the language) has its own storage key
  and stays out of the progress store.
- The tree has no streaks, points, reminders or daily goals, and a browser
  test keeps it so.

## Readiness and the official mock exams

- The readiness view is `#/readiness` (`src/app/ReadinessPage.tsx`). The tree
  leads to it from "Exam" at the end of the strip of levels and from the last
  stop of the last level (`src/app/ExamStop.tsx`).
- The exams are content, not code: `content/official-mock-exams.yaml`,
  compiled to `content/official-mock-exams.json`. To add an exam or correct a
  link, edit that file only; the format is in
  [content/README.md](content/README.md), "Official mock exams". The app
  links to the exams and never requests them, hosts them or copies them.
- The rule is `readiness` in `src/learning-engine/index.ts`: 90 or more in
  every module on two of the exams whose entry says
  `countsTowardReadiness: true`. `readScore` says what a typed score is.
- The scores a learner records are part of their progress (`officialExams`,
  by exam id, saved since version 2), so they are exported and imported with
  it: `officialExamScores` reads them, `recordOfficialExamScores` changes
  them. They are trusted, not verified.
- A link to an exam is not on the page until the learner asks for it, and for
  an exam with no score yet the page first asks whether this is the final
  check. Keep it that way: only a few official sets exist, and one that was
  seen early cannot test the learner again.

## Search and the overview page

- Search runs in the browser. `prepareSearch` in `src/search/index.ts` takes
  the node summaries and the search data, and returns the function that
  answers a query. `fold` in the same file is the one place that says which
  typed text equals which content text; a new habit of typing (another
  keyboard, another script) is a line there and a test in `tests/search/`.
- The search data is built in `src/content-pipeline/search-data.ts`. A node is
  a list of passages, whatever its kind, so a new kind of node becomes
  searchable by adding its passages in `passagesOf` there. Nothing in the app
  changes. Questions and the wrong half of a common mistake are left out on
  purpose.
- A node that is coming soon has no search data and is found by its title,
  which the index has.
- The overview data is built in `src/content-pipeline/overview-data.ts`. A
  node without a table has no entry, and the page shows no box for it.
- `GrammarTableView` (`src/app/GrammarTableView.tsx`) draws a table on a node
  page and on the overview page. A table reads left to right in every
  language.

## Languages

- A component reads `const { language, strings } = useLanguage()` from
  `src/language/index.tsx`: `strings.rule` for an interface word,
  `node.title[language]` for content, `strings.number(7)` for a number shown
  on its own (Persian digits in Persian).
- To add an interface string, add it to `src/language/strings.ts` (English),
  `strings.fa.ts` (Persian) and `strings.de.ts` (simple German, about A2
  level). `pnpm check` fails until all three have it. A string with a number
  in it is a function, so Persian can write its own digits.
- Persian pages are right to left. Use logical CSS properties, and put every
  piece of German in `<German>` or `<RichText>` (`src/app/German.tsx`) so it
  still reads left to right.

## Writing tests

- Content pipeline: start from `tests/fixtures/content`. To test broken
  content, use `fixtureContentWith` in `tests/content-pipeline/fixture.ts` to
  get a temporary copy with files changed or added; `changeNode` changes a
  node as data. One test file per rule. How to add a rule and its test:
  `content/README.md`, "Adding a check".
  A fixture node is reviewed like a real one. A test that changes the
  questions of the published node uses `changeReviewedNode`, or it also gets
  "needs a new review". After changing the questions in a fixture file,
  record its review again with the two review commands and
  `--content tests/fixtures/content`; the fixtures are invented, so you may
  fill in that sheet yourself as "Fixture reviewer".
- Browser: import `test` and `expect` from `tests/browser/test.ts`, not from
  Playwright. That adds the rule that the site talks to no other server (no
  font service, no analytics). Each run builds the site from the fixture
  content and serves it under `/deutsch-tree/` on a free port, so runs in
  several worktrees do not collide. Tests run at phone and at computer size.
  A journey that takes a test uses `tests/browser/taking-a-test.ts`: it
  answers right or wrong from the fixture node's own answer key, whatever
  questions the attempt drew. `takeCheckpoint` does the same for a checkpoint,
  whose questions come from several nodes. The fixture node `grammar-010`
  holds only typed questions and draws its whole pool, so a journey there
  meets every question (`takeTypedTest`).
- The fixture content has three levels: A1 with two published topics
  (`grammar-001`, and `grammar-010` with typed questions) and one "coming
  soon", A2 with three published topics (`grammar-101` to `grammar-103`) and
  B1 with nothing published.
- A journey that needs another tree than the fixture's (several kinds, other
  chapters, hundreds of topics) uses `serveCurriculum` in
  `tests/browser/curriculum.ts`: it gives the page an invented tree written
  in a few lines, and leaves the fixture files alone.

## Deploying

`.github/workflows/pages.yml` runs `pnpm check` on every pull request and
publishes `dist/` to GitHub Pages on every push to `main`. It needs Pages set
to "GitHub Actions" once in the repository settings.

## Not in version control

`research/` and `private/` are ignored on purpose and must never be committed.
`private/` holds private packs; `pnpm build` fails rather than put anything from
it into the site. See [docs/private-packs.md](docs/private-packs.md).
