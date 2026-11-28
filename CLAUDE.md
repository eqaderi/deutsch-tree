# deutsch-tree: notes for agents

- Read `README.md` first: commands, folder layout, how to write tests.
- `pnpm check` runs everything (typecheck, lint, content pipeline on the real content, unit tests, browser tests). It must pass before you report work as done.
- The node file format is in `content/README.md`; its schema is `src/content-model/index.ts`.
- A new rule for content is one file in `src/content-pipeline/checks/`, one line in its `index.ts`, and one test file on fixture content. Steps: `content/README.md`, "Adding a check". A check gets the node files; a rule about a file that is not a node (a mock exam, the official mock exams) is checked where that file is read (`src/content-pipeline/mock-exams.ts`, `readOfficialMockExams` in `index.ts`).
- An exam-part node (`content/README.md`, "A published exam-part node") has no pool: it holds practice tasks (texts and items) in the format of its exam part, is done at 90% of one task, and its review covers the texts too.
- A published node needs a blind review of its questions, and a new one whenever they change. The four steps are in `content/README.md` under "Review before publishing".
- Writing and speaking nodes have a task and no questions, so no pool and no review: `content/README.md`, "A published writing or speaking node". The official marking criteria live in `src/assistant-grading/criteria.ts` and stay word for word as printed; the prompt and the score rule are in the same folder.
- Every screen follows `docs/design-direction.md`. Colours and sizes come from the tokens in `src/app/styles.css`; every interface word comes from `src/language/strings.ts`.
- A new interface string goes into `src/language/strings.ts`, `strings.fa.ts` and `strings.de.ts`; `pnpm check` fails until all three have it. Never write wording, or a bare number, in a component. See `README.md`, "Languages".
- Every Persian text, in a node, a mock exam, `chapters.yaml` or `strings.fa.ts`, follows `content/persian-style.md`: register, the term for each grammar word, spelling, and German kept left to right. Read it before writing Persian.
- A new kind of node, or a new section of a node, that learners should find by search adds its passages in `src/content-pipeline/search-data.ts`. Text that only one page needs never goes into `content/index.json`. See `README.md`, "Search and the overview page".
- Never commit `research/`, `private/` or `share/`.
- The start files and their servers (`src/start-files/folder/`) use only what macOS and Windows ship with: `/usr/bin/perl` with core modules, and Windows PowerShell 5.1 in ASCII. No other runtime, no installs. See `README.md`, "Running the app at home".
- Private packs (format, the `pnpm pack:build` command, a book's profile, how the app finds packs): `docs/private-packs.md`; the schema is `src/content-model/pack.ts`. Pack tests use the synthetic book in `tests/pack-builder/fixture.ts` and write to a temporary folder, never to `private/`; browser tests get the same book as a pack under `/local/`.
- Browser tests and servers must not use a fixed port. `playwright.config.ts` already takes a free one per run.
