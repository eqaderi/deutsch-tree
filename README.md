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
| `content/` | The real content: one YAML file per node under `content/nodes/`, and the chapters that group them in `content/chapters.yaml`. |
| `src/content-model/` | The schema of a node file and the types of the compiled bundle. Everything else depends on it. |
| `src/content-pipeline/` | Node files in, compiled bundle and report out. `cli.ts` is the command; `vite-plugin.ts` runs it inside the build and the dev server. `checks/` holds one file per rule that the schema cannot state. |
| `src/learning-engine/` | The rules of learning as pure functions: draw an attempt, check answers, score, apply a result to progress, name the milestones reached. No interface, no storage; randomness is passed in. |
| `src/assistant-grading/` | Writing and speaking, which the app cannot score: the official marking criteria (`criteria.ts`), the task as the learner reads it, the prompt to paste into an AI assistant, and the rule for the score out of 100. Pure functions on a task; the app calls no AI service. |
| `src/progress-store/` | Keeps progress in browser storage, with a version number, and writes and reads the progress file a learner exports. It reads every older version and refuses a newer one. It only stores; the learning engine decides how progress changes. |
| `src/app/` | App shell: routes, tree, node page, test, backup. `styles.css` holds the design tokens. `progress.ts` gives components the progress. |
| `src/language/` | Interface strings in English, Persian and simple German, the language in use and the page direction. Components take every word from here. |
| `tests/fixtures/content/` | Small invented content that tests run on. Tests of code never depend on the real content. |
| `tests/real-content/` | The one exception: the real content held against facts of the approved lists that no check can know, such as "the grammar list has 212 rows" or "the exam has 15 parts". |
| `tests/content-pipeline/` | Seam 1: run the pipeline on fixture content and assert on the report. |
| `tests/learning-engine/` | Seam 2: the learning engine's functions, with a seeded stand-in for randomness. |
| `tests/assistant-grading/` | The prompt and the score rule, on invented tasks (`tasks.ts`). The expected criteria and points are written out from the official score sheets. |
| `tests/progress-store/` | The progress store on a stand-in for browser storage, and the progress file. `older-versions.test.ts` holds text saved by each earlier version. |
| `tests/language/` | The interface strings of the three languages, compared key by key. |
| `tests/browser/` | Seam 3: whole journeys in a browser. |
| `src/pack-builder/` | A learner's own exam book in, a private pack out. `cli.ts` is the command; `vite-plugin.ts` keeps packs out of the site build. The pack format's schema is `src/content-model/pack.ts`. |
| `tests/pack-builder/` | Seam 4: build a pack from a synthetic book (`fixture.ts`) and assert on the pack. |

The app never reads node files. It fetches `content/index.json` (the chapters
and every node's summary, both in curriculum order) and
`content/nodes/<id>.json` (one node's page), both written by the pipeline at
build time.

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
- A writing or speaking node has no test of questions. Its page
  (`src/app/ExamTaskPage.tsx`) shows the task, a button that copies a prompt
  for an AI assistant, and a box for the score that comes back;
  `applyEnteredScore` keeps the score and marks the node done at 90 of 100.
  The three pieces (`TaskSheetView`, `CopyPrompt`, `ScoreEntry` in
  `src/app/AssistantGrading.tsx`) know nothing of nodes or progress, and the
  prompt comes from `assistantPrompt(task, language)` in
  `src/assistant-grading/`, so a mock exam can use them for its own tasks.
  The app only copies text; it never calls an AI service.
- The score of one task is its points brought to a scale of 100
  (`src/assistant-grading/score.ts`). Schreiben: the share of the task's own
  points (40, 40, 20). Sprechen: the part's criteria count for 84 points and
  pronunciation, rated on that part alone, for its official 16. The prompt
  states the same rule to the assistant.
- Whether a node has a pool or is graded by an assistant: `hasPool` and
  `isAssistantGraded` in `src/content-model/scoring.ts`. The app imports
  these from that file, not from `index.ts`, which holds the schema that only
  the pipeline needs.
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
  add a step to `UPGRADES`. The top of that file has the full steps. A field
  inside a node that may be absent (`scores`, the scores typed in for a
  writing or speaking node) is a line in `readNodes` and needs no new version.
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

## Deploying

`.github/workflows/pages.yml` runs `pnpm check` on every pull request and
publishes `dist/` to GitHub Pages on every push to `main`. It needs Pages set
to "GitHub Actions" once in the repository settings.

## Not in version control

`research/` and `private/` are ignored on purpose and must never be committed.
`private/` holds private packs; `pnpm build` fails rather than put anything from
it into the site. See [docs/private-packs.md](docs/private-packs.md).
