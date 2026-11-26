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
| `src/learning-engine/` | The rules of learning as pure functions: draw an attempt, check answers, score, apply a result to progress. No interface, no storage; randomness is passed in. |
| `src/progress-store/` | Keeps progress in browser storage, with a version number. It only stores; the learning engine decides how progress changes. |
| `src/app/` | App shell: routes, tree, node page, test. `styles.css` holds the design tokens. `progress.ts` gives components the progress. |
| `src/language/` | Interface strings in English, Persian and simple German, the language in use and the page direction. Components take every word from here. |
| `tests/fixtures/content/` | Small invented content that tests run on. Tests of code never depend on the real content. |
| `tests/real-content/` | The one exception: the real content held against facts of the approved lists that no check can know, such as "the grammar list has 212 rows". |
| `tests/content-pipeline/` | Seam 1: run the pipeline on fixture content and assert on the report. |
| `tests/learning-engine/` | Seam 2: the learning engine's functions, with a seeded stand-in for randomness. |
| `tests/progress-store/` | The progress store on a stand-in for browser storage, including text saved by each earlier version. |
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
  `checkAnswer`, `scoreAttempt`, `applyAttempt`, `isDone`. Components call
  these and hold no rule of their own.
- Progress: read it with `useProgress()` and change it with
  `updateProgress((progress) => …)` from `src/app/progress.ts`, where the
  function comes from the learning engine. The saved text has a version
  number; `src/progress-store/index.ts` says what to do when its shape changes.
- A new question type needs: its schema and compiled type in
  `src/content-model/index.ts`, its review view in
  `src/content-pipeline/review.ts`, a case in `checkAnswer`, a case in
  `QuestionView` and in `AnswerText` (`src/app/QuestionView.tsx`), and its
  instruction in the three string files. The type checker points at each
  place that is missing.

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
  in. Build such an address with `treeAddress` (`src/app/treeAddress.ts`);
  link "back to the tree" with `lastTreeAddress()`, which keeps the level and
  kind the learner chose.
- A row of a topic, in the tree or in another list, is `NodeRow`
  (`src/app/NodeRow.tsx`).
- A setting of the device that is not progress (the dismissed first-visit
  steps in `src/app/firstVisit.ts`, the language) has its own storage key
  and stays out of the progress store.
- The tree has no streaks, points, reminders or daily goals, and a browser
  test keeps it so.

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
  questions the attempt drew.
  A journey that needs a bigger tree than the two fixture topics (several
  levels, kinds or chapters, hundreds of topics) uses `serveCurriculum` in
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
