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
| `pnpm vocabulary:scope --lists <folder>` | Writes the vocabulary scope list from the extracted word lists, which are not in the repository. `pnpm vocabulary:approval` then rewrites the lists in `docs/approvals/vocabulary-themes.md`. See [content/README.md](content/README.md), "The vocabulary scope list". |
| `pnpm audio:generate --voices <folder>` | Says every German example and word of the published nodes with Piper, in both voices a learner may choose, and stores it as `content/audio/<key>.mp3`. Says only what is new or changed. Needs Piper and ffmpeg on this computer; nothing else does. See "Audio" below. |
| `pnpm pack:build` | Builds a private pack from a book the learner owns. Options and format: [docs/private-packs.md](docs/private-packs.md). |
| `pnpm share` | Builds the site and writes the folder that runs the app at home, with the packs and the start files (default `share/`, `--out <folder>`). See [Running the app at home](#running-the-app-at-home). |
| `pnpm dev` | Dev server on the real content. Content files reload on save. |
| `pnpm build` | Compiles the content and builds the site into `dist/`. Fails on any content error. |

`CONTENT_DIR=<folder>` makes `dev`, `build`, `content:check` and the review commands use another
content folder, for example `tests/fixtures/content`.

## Layout

One folder per module of the spec. Relative imports carry the `.ts` or `.tsx`
ending, because the pipeline runs directly in Node.

| Folder | Module |
|---|---|
| `content/` | The real content: one YAML file per node under `content/nodes/`, the chapters that group them in `content/chapters.yaml`, the original mock exams in `content/mock-exams/`, and the official mock exams the app links to in `content/official-mock-exams.yaml`. |
| `src/content-model/` | The schema of a node file and the types of the compiled bundle. Everything else depends on it. |
| `src/content-pipeline/` | Node files in, compiled bundle and report out. `cli.ts` is the command; `vite-plugin.ts` runs it inside the build and the dev server. `checks/` holds one file per rule that the schema cannot state. |
| `src/search/` | Search as pure functions: the node summaries and the search data of one language in, the nodes found for a query out. It decides how typed text meets content (umlauts, capitals, Persian letter forms). No interface, no loading. |
| `src/vocabulary-scope/` | Which words are in scope: the extracted word lists in, the scope list in `content/vocabulary/` out. `SCOPE_RULE` is the one setting that decides it. `approval.ts` writes the lists of the vocabulary approval document. |
| `src/learning-engine/` | The rules of learning as pure functions: draw an attempt, check answers, score, apply a result to progress, name the milestones reached. No interface, no storage; randomness is passed in. |
| `src/assistant-grading/` | Writing and speaking, which the app cannot score: the official marking criteria (`criteria.ts`), the task as the learner reads it, the prompt to paste into an AI assistant, and the rule for the score out of 100. Pure functions on a task; the app calls no AI service. |
| `src/audio/` | German in the compiled content to the audio files that say it: `speakable` writes numbers as words, `spoken` gives a piece of German one person says its key in each voice a learner may choose and `spokenBy` a dialogue line its key in its speaker's voice, `spokenItems` finds everything a page can play, `generateAudio` makes the missing files with a voice engine passed in (`piper.ts`), and `cli.ts` is the command. The voices are in `src/content-model/audio.ts`. |
| `src/anki-export/` | Vocabulary words in, the text of a file that Anki imports out. Pure functions; the app saves the file in the browser. |
| `src/progress-store/` | Keeps progress in browser storage, with a version number, and writes and reads the progress file a learner exports. It reads every older version and refuses a newer one. It only stores; the learning engine decides how progress changes. |
| `src/app/` | App shell: routes, tree, node page, test, backup, search page, overview page. `styles.css` holds the design tokens. `progress.ts` gives components the progress. |
| `src/language/` | Interface strings in English, Persian and simple German, the language in use and the page direction. Components take every word from here. |
| `tests/fixtures/content/` | Small invented content that tests run on. Tests of code never depend on the real content. |
| `tests/real-content/` | The one exception: the real content held against facts of the approved lists that no check can know, such as "the grammar list has 212 rows" or "the exam has 15 parts" or "every vocabulary node holds words of its own level". |
| `tests/content-pipeline/` | Seam 1: run the pipeline on fixture content and assert on the report. |
| `tests/vocabulary-scope/` | The scope rule and the corrections, on invented rows of a word list. |
| `tests/learning-engine/` | Seam 2: the learning engine's functions, with a seeded stand-in for randomness. |
| `tests/audio/` | How numbers are spoken, and the audio command on fixture content with a stand-in for Piper. |
| `tests/anki-export/` | The exact text of the Anki file for a few invented words, in each language. |
| `tests/assistant-grading/` | The prompt and the score rule, on invented tasks (`tasks.ts`). The expected criteria and points are written out from the official score sheets. |
| `tests/search/` | Search on a small invented catalogue (`catalogue.ts`): what a query finds, in which order, and which passage a result shows. |
| `tests/progress-store/` | The progress store on a stand-in for browser storage, and the progress file. `older-versions.test.ts` holds text saved by each earlier version. |
| `tests/language/` | The interface strings of the three languages, compared key by key. |
| `tests/browser/` | Seam 3: whole journeys in a browser. |
| `src/pack-builder/` | A learner's own exam book in, a private pack out. `cli.ts` is the command; `vite-plugin.ts` keeps packs out of the site build. The pack format's schema is `src/content-model/pack.ts`. |
| `tests/pack-builder/` | Seam 4: build a pack from a synthetic book (`fixture.ts`) and assert on the pack. |
| `src/pack-loader/` | Finds the private packs in the browser (`private/packs.json`, then each `pack.json`) and hands them to the private exam view (`#/packs`, `src/app/PacksPage.tsx` and `PackExamPage.tsx`). How detection works and what a start file must serve: [docs/private-packs.md](docs/private-packs.md), "Finding packs in the app". |
| `src/start-files/` | The folder that runs the app at home: `index.ts` copies the built site and the packs and adds the templates in `folder/` (the two start files, their servers in `folder/server/`, the learner's instructions in English and Persian). `cli.ts` is `pnpm share`. |
| `tests/start-files/` | The two servers run on a temporary folder (`server.ts` starts them as the start files do), and the folder that `pnpm share` writes. The browser journey `tests/browser/start-files.spec.ts` runs the app from that folder with the Mac start file. |

The app never reads node files. It fetches files that the pipeline writes at
build time, each only on the page that shows it:

| File | Holds | Fetched by |
|---|---|---|
| `content/index.json` | The chapters and every node's summary, both in curriculum order. | Every page. |
| `content/nodes/<id>.json` | One node's page. | That node's page and its test. |
| `content/checkpoints/<level>.json` | The pool of every published topic of the level that has one (`checkpoint-data.ts`). | That level's checkpoint (`#/checkpoint/<level>`). |
| `content/official-mock-exams.json` | The exams the readiness view links to. | The readiness view (`#/readiness`) and the exam stop that ends the tree's last level. |
| `content/mock-exams.json` | The original mock exams: title, status and modules of each. | The list of mock exams (`#/mock-exams`) and a module's page. |
| `content/mock-exams/<id>.json` | One mock exam with its parts. | Its card in the list, and its modules (`#/mock-exams/<id>/<module>`). |
| `content/search/<language>.json` | The text of every published node as a list of passages, in one language plus the German. | The search page (`#/search`), in the learner's language only. |
| `content/overview.json` | Every grammar table. | "All grammar at a glance" (`#/overview`). |
| `content/audio/<key>.mp3` | The audio of one piece of German. | Only when the learner presses its play button. |

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
- An exam part has no pool. For a reading part the same address runs
  `PracticeTest` (`src/app/PracticeTest.tsx`) on one of its practice tasks
  (`hasPractice(content)` in `src/content-model/scoring.ts`): the texts and
  all items on one page, as in the exam, then the result of every item. The
  engine's `nextTask` picks the task (another one on a retry) and
  `scoreAttempt(task.items, answers)` scores it per item, with the same 90%
  rule; `applyAttempt` marks the part done. An item is a `Question`, so
  `QuestionView`, `AnswerText` and the "report a problem" link serve it too.
- A listening part runs the same `PracticeTest`. Its task's texts are heard
  (`isHeard(text)` in `scoring.ts`): each is a list of lines, each line with
  its speaker and its `audio` in that speaker's voice. While the items are
  answered the page shows only `PlayRecording` (`src/app/PlayButton.tsx`),
  which plays the lines one after the other; the result shows what is said,
  line by line, each with its `PlayButton`. A task holds texts to read or
  texts to hear, as `textsAre` in its part's format says. The views of a
  task (`TaskTexts`, `TaskItems`, `ItemResults`) are in
  `src/app/ItemTaskView.tsx`, shared with the mock exams.
- A task that the app scores per item (`ItemTask` in the content model:
  texts and items; schema `itemTaskSchema`, compiled by `compileItemTask`,
  formats per exam part in `ITEM_TASK_FORMATS`, format check
  `itemTaskProblems`) does not depend on the node that holds it, so a mock
  exam's reading parts can take the same shape, and a Hören part the same
  mechanism. A new item type is a new question type plus a place in the
  `taskItem` union of the schema; a new exam part is a row in
  `ITEM_TASK_FORMATS`. (`ExamTask` is the other kind of exam task: the
  writing or speaking task that an AI assistant grades.)
- Every exam-part page, of all 15 parts, begins with the same three panels
  (what the part asks, how it is scored, how to approach it):
  `ExamPartSections.tsx`, from the node's `explanations`. What follows
  depends on the module: the button to the practice task (Lesen), or the
  task, prompt and score of `ExamTaskSections` (Schreiben, Sprechen).
- Every rule is in `src/learning-engine/index.ts`: `drawAttempt`, `passMark`,
  `checkAnswer`, `scoreAttempt`, `applyAttempt`, `isDone`, and for a
  checkpoint `drawCheckpoint` and `scoreCheckpoint`. Components call these
  and hold no rule of their own.
- Each attempt shows what the learner chooses from in an order of its own:
  `asAsked(question, random)` draws the options of a multiple choice, gap
  fill or `meaning-of-word` question, and the partners of a matching
  question (never in the order of the answer). `drawQuestions`, and so
  `drawCheckpoint`, give their questions as asked; a practice task or a
  part of a mock exam is asked through `taskAsAsked(task, random)` when it
  starts. The order is kept in the attempt's state, so it stays while the
  attempt runs and across a change of language. An answer names an option,
  never its place, so scoring, the review sheets and the saved progress do
  not depend on it. A new question type with something to choose from gets
  a case in `asAsked`.
- A level's checkpoint is at `#/checkpoint/<level>`
  (`src/app/CheckpointPage.tsx`); the tree ends each level's line with it. It
  asks through the same `AttemptRun` as a node's test, so a new question type
  works in it without more code. `drawCheckpoint` asks 30 questions at most
  and 5 at most of one node, dealt in rounds over the published nodes of the
  level: up to 6 nodes give 5 each, 7 to 29 nodes share the 30 evenly, and
  from 30 nodes on a checkpoint asks 30 nodes drawn at random, one question
  each. A node without a pool gives none; an exam part gives none either (`givesToCheckpoint`). `scoreCheckpoint` reports the nodes
  with wrong answers, and keeps the notes of a typed answer accepted with a
  note, which the result lists as after a test (`NotedAnswers` in
  `TestResult.tsx`). A checkpoint is advice: it never reads or changes the
  progress. What the nodes of a level give to it is one file,
  `content/checkpoints/<level>.json`, written by
  `src/content-pipeline/checkpoint-data.ts`, so a checkpoint needs one request
  however many topics its level has. The stop of the checkpoint ends with the
  way on to the next level.
- A writing or speaking node has no test of questions. Below the three
  panels of every exam part, its page (`src/app/ExamTaskPage.tsx`) shows the
  task, a button that copies a prompt
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
- A vocabulary node writes no questions. `vocabularyPool(words)` in the
  learning engine makes its pool: for every word one `meaning-of-word`
  question (the word with its article, choose its meaning) and one
  `word-for-meaning` question (the meaning, type the word; a noun only with
  its article, through `checkTyped`). The content pipeline calls it once
  (`src/content-pipeline/vocabulary.ts`) for the compiled node and for the
  review, so what was reviewed is what is asked. A `word-for-meaning` prompt
  is the meaning in each language (`de` is the German definition); the app
  shows the one of the page's language. `drawQuestions` draws a test so that
  it asks about a word once and takes the two directions in turn; for a pool
  of other questions it is `drawAttempt`. Its page is
  `src/app/VocabularySections.tsx`. The words, as `VocabularyWord`, are what
  an export (Anki) or audio of words reads; `asLearned(word)` is the word
  with its article, as it is said and asked.
- A vocabulary page ends with the export to Anki (`src/app/AnkiExport.tsx`):
  the words of that node, or of every vocabulary node the learner has
  started, as a file the browser saves. "Started" is `startedVocabulary` in
  the learning engine: published, and done or in progress by `nodeState`.
  The other nodes' files are fetched only when the learner asks for that
  export. The file is `ankiText(words, language)` in `src/anki-export/`:
  Anki's plain-text import with file headers (Anki 2.1.54 or newer), one
  Basic note per word, the word with its article in front, the meaning in
  the page's language (the German definition in simple German; Persian
  marked right to left) and the example on the back. Each note has a GUID
  made from its word, so an updated file updates the cards instead of
  copying them. The top of that file says why each header is there.
- Whether a node has a pool or is graded by an assistant: `hasPool` and
  `isAssistantGraded` in `src/content-model/scoring.ts`; which page it has:
  `isGrammar`, `isVocabulary`, `isPhrases`, `hasPractice`, `hasExamTask`. Use these
  rather than testing for a key of the content. The app imports
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
- A node of any kind with a pool is tested the same way. What differs is its
  page: `NodePage.tsx` shows the grammar sections, or for a phrases node
  `PhraseSections.tsx` (what the phrases are for, then a card per phrase with
  its meaning, an example and links to the exam parts it serves). A kind
  gets a page by naming its sections in `SECTIONS_OF_A_PUBLISHED` in
  `src/content-model/index.ts`, a compile step in
  `src/content-pipeline/index.ts`, and a case in `NodePage.tsx`; its
  passages for search go in `search-data.ts`.
- A new question type needs: its schema and compiled type in
  `src/content-model/index.ts`, its review view in
  `src/content-pipeline/review.ts`, a case in `checkAnswer`, in `rightAnswer`
  and in `isAnswered`, a case in `QuestionView` and in `AnswerText`
  (`src/app/QuestionView.tsx`), and its instruction in the three string
  files. The type checker points at each place that is missing.
- A question whose answer is typed shows `TypedAnswer`
  (`src/app/TypedAnswer.tsx`: the field and the ä, ö, ü, ß buttons) and is
  checked with `checkTyped(text, acceptedAnswers)`. A check says `correct`,
  and for an answer accepted with a note also `notes` (which slips:
  `umlaut-substitute`, `capitalisation`) and `accepted` (the exact spelling).
  `scoreAttempt` keeps both for each question, and the result lists them
  under "Accepted with a note". A missing or wrong word is never a slip.
- A type whose answer is built in steps (word ordering, matching) keeps the
  unfinished answer in the same place as a finished one; `isAnswered` in the
  learning engine says when the test may move on. A type that shows its
  material mixed gets the order from `src/content-pipeline/mix.ts`: `mixed`
  for the reviewer's sheet (it must not lean on the answer), `mixedAwayFrom`
  for the compiled question. Matching partners are drawn again for each
  attempt (`asAsked`, above). A larger view gets its own file beside `QuestionView.tsx`
  (`WordOrder.tsx`, `FindError.tsx`, `Matching.tsx`).

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
  is published and that the app can test it: it has a pool, or it is an exam
  part with a practice task. Only then does a row offer "Test" (for an exam
  part: "Practice task"), which goes to `#/node/<id>/test`. A node that
  becomes done in another way, such as a score typed in, has no such link.
- **What the tree shows is in its address**: `#/?level=A2&kind=vocabulary`.
  With no level in the address the tree opens at the level the learner is
  in. Build such an address with `treeAddress` (`src/app/treeAddress.ts`).
  A link "back to the tree" is `<BackToTree from={node} />` from a topic,
  which leads to the topic's level, `<BackToTree level={level} />` from a
  page of a level (its checkpoint), and `<BackToTree />` from any other
  page, which leads to the tree as the learner last saw it.
- Any other link back at the top of a page is `BackLink`, and the title of a
  page's browser tab is `PageTitle` (both `src/app/PageTitle.tsx`).
- Above the route the tree shows the next topic and at most one note: the
  first-visit steps while the learner has no progress, the backup suggestion
  once they have a milestone. A new note must not make a third panel there.
- A row of a topic, in the tree or in another list, is `NodeRow`
  (`src/app/NodeRow.tsx`).
- A setting of the device that is not progress (the dismissed first-visit
  steps in `src/app/firstVisit.ts`, the language) has its own storage key
  and stays out of the progress store. The voice is the exception (ticket
  #41): it is `voice` in the progress (saved since version 4), so that an
  export carries it to another device; `hasProgress` does not count it.
- The tree has no streaks, points, reminders or daily goals, and a browser
  test keeps it so.

## The original mock exams

- The list is `#/mock-exams` (`src/app/MockExamsPage.tsx`), reached from the
  exam stop at the end of the tree. A module is taken at
  `#/mock-exams/<exam>/<module>` (`src/app/MockExamPage.tsx`).
- An exam is content: `content/mock-exams/<id>.yaml` ("Mock exams" in
  [content/README.md](content/README.md)), read by
  `src/content-pipeline/mock-exams.ts`. Its Lesen and Hören parts are
  `ItemTask`s, held to `ITEM_TASK_FORMATS`, reviewed blind and compiled like
  the practice tasks of an exam part; `mockExamTasks` names them `lesen-1` to
  `hoeren-4`. Its Schreiben and Sprechen parts are `ExamTask`s, the task of a
  writing or speaking node, held to the same `TASK_FIELDS`; they have no key,
  so they are not on the review sheet. Compiled, an exam is `MockExam` with
  its `modules` (`MockExamModule`: `ItemTaskModule` or
  `AssistantTaskModule`), each with its `minutes` (from `EXAM_MODULE_FACTS`)
  and its parts; a heard part also says how often it is `plays`.
- **The shell.** `MockExamPage.tsx` is a shell around a module: the start
  (with the time limit switched on or off), the clock (`timeLeft` in the
  learning engine; it can be switched off while the module runs, and when
  time is up the run finishes with the answers so far), and the result. What
  the learner does inside the module is `ModuleRun`, picked by the module's
  `scoredBy`: `ItemModuleRun` for Lesen and Hören, `AssistantModuleRun` for
  Schreiben and Sprechen. A run gets `ModuleRunProps` (the exam, the module,
  `timeUp`, `onFinish`) and finishes with `FinishedModule`: each part's
  `{ part, correct, total }` and what to show below the result. The row of
  parts (`PartChoice`) and the buttons below them (`ModuleActions`) are
  shared by both runs.
- **Schreiben and Sprechen.** Each task shows its sheet, the steps and the
  prompt to copy (`TaskSheetView`, `GradingSteps` with `CopyPrompt`, from
  `src/app/AssistantGrading.tsx`, as on a writing or speaking node) and a
  `ScoreEntry` for the score out of 100 that the assistant gives. When the
  time is up the learner stops writing or speaking but still enters the
  scores; the module ends only when the learner finishes it, and a task
  without a score counts as 0. `modulePoints` (`src/assistant-grading/score.ts`)
  makes the scores points of each part's weight: Schreiben 40, 40, 20; Sprechen
  33, 48, 19 (each part's 28, 40 or 16 points with its share of Aussprache's
  16). The points are whole and add up to the module score the exam rule
  gives, so the score, the result and the history work as for Lesen.
- **Scores.** `mockModuleResult` scores a module over all its parts out of
  100 (`scoreModule`, so 27 of 30 is 90); `scoreStanding` says where it
  stands against `PASS_SCORE` (60) and `READINESS_SCORE` (90). A result shows
  the score large, that standing in words, and each part in the
  `module-scores` boxes of the readiness view (`MockResultSummary`).
- **History.** Every finished module is kept in the progress
  (`mockExams`, oldest first, saved since version 3) with
  `recordMockExamResult`; `mockExamHistory` gives them the latest first. A
  result is never replaced. Original mock exams do not count toward
  readiness: only the official ones do.
- In Hören each recording plays as often as the exam plays it
  (`PlayRecording` with `plays`); the transcript is shown only in the
  result.

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
- A diagram is read by `readDrawing` in `src/content-model/diagram.ts`: an
  allow-list of shapes, attributes and classes, turned into a small tree.
  `DiagramView` (`src/app/DiagramView.tsx`) draws that tree with React, so no
  markup from content is ever inserted, left to right in every language, with
  its labels in the learner's language. Its look is the "Diagrams" block of
  `styles.css`. Search finds a diagram by its caption. The format for
  maintainers: [content/README.md](content/README.md), "Diagrams".
- A recognise-only node is labelled by `RecogniseOnlyLabel`
  (`src/app/RecogniseOnly.tsx`) in its tree row, on its page and on its
  test. Which question types it may not use is `PRODUCING_QUESTION_TYPES` in
  `src/content-model/index.ts`.

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
  holds only typed questions and draws 15 of its 16, so a journey there
  meets nearly every question; `takeTypedTest` retakes the attempt until the
  questions the journey needs came up.
  A new question type gets a case in `giveAnswer`, `expectAnswerGiven` and
  `rightAnswerText` there. A journey about one type of `grammar-001` calls
  `findQuestion`, which brings a question of that type on screen.
- The fixture content has three levels of grammar: A1 with two published
  topics (`grammar-001`, and `grammar-010` with typed questions) and one
  "coming soon", A2 with three published topics (`grammar-101` to
  `grammar-103`) and B1 with no published grammar. B1 also holds the
  published writing and speaking parts `exam-schreiben-1` and
  `exam-sprechen-1`. A fourth level, B2, holds the published phrases node
  `phrases-greeting` and the "coming soon" exam part `exam-schreiben-3`; its
  phrases serve that part and `exam-sprechen-1`. B2 also holds the published
  listening part `exam-hoeren-3`: two short conversations of Lena (Kerstin)
  and Jonas (Thorsten). B2 is the last level, so its
  line ends with the exam. A new fixture node of another kind goes there too,
  so that the counts of the levels above stay as their tests know them.
- The fixture's mock exams are `tests/fixtures/content/mock-exams/`:
  `mock-exam-1` is published, with every part of Lesen and Hören in its
  format (short invented texts; Hören Teil 4 in all three voices), and
  `mock-exam-2` is coming soon. `tests/browser/mock-exam.spec.ts` answers its
  items from that file.
- A journey that takes a practice task uses `tests/browser/taking-a-task.ts`
  with the part (`READING` or `LISTENING`); one that hears German records
  what plays with `listen` in `tests/browser/listening.ts`.
- One question type: `tests/content-pipeline/extra-question.ts` adds one
  question to the fixture pool and gives back what the pipeline makes of it;
  `review-sheet.ts` holds a reviewer's answers to the fixture pool.
- A journey that needs another tree than the fixture's (several kinds, other
  chapters, hundreds of topics) uses `serveCurriculum` in
  `tests/browser/curriculum.ts`: it gives the page an invented tree written
  in a few lines, and leaves the fixture files alone.

## Audio

- German is heard in a stored voice, never the browser's own speech, so it
  sounds the same on every device. The voices (ticket #5) are Piper's
  Thorsten (medium), which says every example and word, and Kerstin (medium),
  the second voice of a dialogue. The third, `mls-5424` (ticket #27), is
  speaker 5424 of Piper's MLS (medium) model (Piper's speaker number 12,
  passed as `--speaker`), for the third speaker of Hören Teil 4: a woman's
  voice clearly higher than Kerstin's. They are `VOICES` in
  `src/content-model/audio.ts`. The format is MP3, 48 kbit/s, mono.
- **The voice a learner chooses** (ticket #41): Thorsten (male, the main
  voice and the default) or Kerstin (female), for everything one person
  says. `CHOOSABLE_VOICES` in `src/content-model/audio.ts`; the choice is
  `voice` in the progress, set by `chooseVoice` from the switch at the foot
  of every page (`src/app/VoiceSwitch.tsx`). A line of a dialogue keeps its
  speaker's voice whatever the learner chose.
- The pipeline attaches `audio` (a `Spoken`: `key`, `voice`, `text`) to every
  piece of German that has a play button: each example of a grammar node and
  of a phrase, the right sentence of each common mistake (never the wrong
  one), each phrase itself, and each vocabulary word (with its article) and
  its example. These are said by one person, so `spoken(text)` also gives
  them `byVoice`, the key of the text in each voice a learner may choose;
  `key` and `voice` are the main voice's. A play button plays
  `keyFor(audio, voice)`: the chosen voice's file, or for a dialogue line
  (no `byVoice`) its speaker's.
  `text` is what the voice says: `speakable` in `src/audio/speakable.ts`
  writes numbers, times, dates, years and amounts as words, because Piper
  misreads digits ("14:35 Uhr").
- **The key** is the first 16 hex digits of the SHA-256 of
  `<voice>\n<spoken text>`: `printf 'thorsten\nIch wohne in Berlin.' | shasum -a 256`.
  It is made from the text and never from the audio, so it is known without
  Piper, the same words in the same voice are one file wherever they stand,
  and a changed text gets a new file. The file is `content/audio/<key>.mp3`,
  in the site `content/audio/<key>.mp3`.
- The content check fails for a published node whose spoken item has no file
  in one of its voices (both chosen voices for what one person says, the
  speaker's voice for a dialogue line), and for spoken text that still holds a digit (`src/content-pipeline/audio.ts`).
  Neither needs Piper, and nor does `pnpm check` or CI. A "coming soon" node
  needs no audio. The build copies only the files that published nodes play.
- **Generating.** Piper (`piper-tts`) and the voice files
  (`de_DE-thorsten-medium.onnx` with its `.onnx.json`, the same for Kerstin)
  are installed outside the repository, and so is `de_DE-mls-medium.onnx`
  for the third voice. Then:

  ```sh
  pnpm audio:generate --voices <folder of the .onnx files> --piper <path to piper>
  ```

  It says what has no file yet, removes the files no content needs any more
  (also those of a node set back to "coming soon"; they are made again when
  it is published),
  and prints each file it makes. `--redo <key>,<key>` says items again when
  the voice slipped on them (Piper is not repeatable, so a second take often
  comes out right); `--force` says everything again, after a voice model
  changed. Commit the MP3 files with the content change. Never commit a WAV
  (`.gitignore` ignores them), and keep full regenerations rare: each adds
  the whole audio to the history again.
- **Size** (measured on ticket #41, on the 8 published sample nodes): what
  one person says is 88 files, 0.86 MB in Thorsten and 0.98 MB in Kerstin
  (about 10 and 11 KB a file, so Kerstin is about 14% larger); the 19
  dialogue lines are 1.28 MB. Ticket #5 projected about 200 MB for one voice;
  with the second voice the whole tree stays under about 430 MB (43%),
  under half of GitHub Pages' 1 GB.
- **Fixture content** gets a silent file per item, without Piper:
  `pnpm audio:generate --content tests/fixtures/content --silent`. A test
  that changes spoken German of a fixture node compiles with
  `compileContent(dir, { requireAudio: false })`, unless audio is what it tests.
- A play button is `PlayButton` (`src/app/PlayButton.tsx`) given the `audio`
  of the German; an example with its button and translation is
  `SpokenExample`. It loads the file only when pressed, and one piece plays
  at a time.
- **A second voice: the lines of a conversation.** A text to hear in a
  listening part names its speakers, each with a voice (`voiceSchema` from
  `src/content-model/audio.ts`: `voice: kerstin`), and `compileTaskText`
  gives each line `audio: spokenBy(line.text, <its speaker's voice>)`, with no `byVoice`. Anything
  in a compiled node that carries `audio` is found by `spokenItems`, so the
  command generates it, the check asks for its file and the build ships it
  with no other change; a mock exam's lines are found the same way
  (`spokenInBundle`). Two speakers of a text may not share a voice, so Hören
  Teil 4 uses all three.
- The licence of the Kerstin voice asks for a credit (Hi-Fi TTS, NVIDIA;
  reader Cori Samuel), and so does the MLS voice (Multilingual LibriSpeech,
  CC BY 4.0, Facebook AI; read from LibriVox). It is `voiceCredit` in the
  strings, at the foot of every page.

## Running the app at home

The public site has everything except the private packs. To use a pack, the app runs on the
learner's computer from a folder that `pnpm share` writes (default `share/`, ignored by version
control because it holds the packs):

| In the folder | What it is |
|---|---|
| `Start on Mac.command` | Double-click on a Mac. Runs `server/serve.pl` with `/usr/bin/perl`, which ships with macOS. |
| `Start on Windows.bat` | Double-click on Windows 10 or 11. Runs `server/serve.ps1` with Windows PowerShell 5.1, which ships with Windows, without administrator rights. |
| `instructions-en.html`, `instructions-fa.html` | The learner's instructions: starting, first-time prompts, the phone, progress, passing the folder on. |
| `app/` | The built site, with the packs in `app/private/`. A pack copied there by hand is found at the next start. |

The decision for a local server, and the trial of the candidate servers, are on issue #4. Both
servers use only what the system ships with, call it by its full path, use port 8000 and no other,
and listen on every network interface. When they start they rewrite
`app/private/packs.json` and `app/private/address.json` (see [docs/private-packs.md](docs/private-packs.md),
"Finding packs in the app"), print the address for this computer and for a phone, and open the
browser. They answer GET and HEAD with single byte ranges, and nothing outside `app/`. Both
servers are tested on Mac and Linux (`tests/start-files/`); the PowerShell one runs there under
PowerShell 7 when `pwsh` is installed, as on GitHub's runners, and is skipped otherwise.

Things to know:

- Progress is kept by the browser for each address. `localhost:8000`, the phone's
  `192.168.x.x:8000` and the public site each have their own; the backup page moves it. So the
  servers never move to another port, where the progress would seem gone. When 8000 is taken they
  ask it for `private/address.json`: if it answers, deutsch-tree is already running, and the server
  says so, opens the browser there and stops; otherwise it says that another program has the port
  and stops. The tests give the servers a free port of their own.
- Anyone on the same network can open the app and the packs while it runs. The instructions tell
  the learner to start it on the home Wi-Fi only. Whether it should listen only on this computer by
  default is the learner's decision (#4); until then it listens on every interface.
- A start file that arrives by download or AirDrop is blocked once by macOS ("Open Anyway" in
  Privacy & Security) or by Windows SmartScreen ("More info", "Run anyway"). A Mac keeps the
  start file executable only when the folder travels as a zip.
- The first time, Windows Defender Firewall asks about "Windows PowerShell"; allowing it needs an
  administrator and is what lets a phone in. The macOS firewall, when it is on, asks the same about
  Perl.

**Manual check (once, on the household computers).** Nobody has double-clicked the start files
yet; the tests start them from a shell. Run `pnpm share`, zip the `share` folder, and copy it to
each computer the way it will travel (AirDrop, download or USB stick). Then:

1. Unzip it and double-click the start file. Write down every prompt (Gatekeeper, SmartScreen,
   firewall, folder access) and whether the browser opened the app.
2. Open "Your exam books" from the footer: the pack is listed, and the panel "On a phone or tablet"
   shows an address.
3. On a phone on the same Wi-Fi, type that address. The tree opens. Open the pack's Hören part:
   the recording plays, and on an iPhone the slider can be dragged.
4. Copy a pack folder into `app/private`, close the window, start again: the pack is listed.
5. Close the window: the app stops (the page no longer reloads).

If a step fails on one system, the fallback in issue #4 (a build opened from the file system)
still stands; record what happened on issue #32.

## Deploying

`.github/workflows/pages.yml` runs `pnpm check` on every pull request and
publishes `dist/` to GitHub Pages on every push to `main`. It needs Pages set
to "GitHub Actions" once in the repository settings.

## Not in version control

`research/`, `private/` and `share/` are ignored on purpose and must never be committed.
`private/` holds private packs; `pnpm build` fails rather than put anything from
it into the site. `share/` is the folder `pnpm share` writes, with copies of the packs. See [docs/private-packs.md](docs/private-packs.md).
